// 双驱动 DB adapter
// - 本地 dev：better-sqlite3（同步，文件 data/app.db）
// - 远端 prod：@libsql/client（async，Vercel 上连 Turso `libsql://...`）
//
// 选择依据：
//   process.env.DATABASE_URL 存在且以 "libsql://" / "https://" 开头 → 远端
//   否则 → 本地 SQLite 文件
//
// 所有 repo 函数都通过本文件暴露的 getDb() / withTx() 访问，
// 对上层（repo / run-all / API routes）只看一套 async 接口。

import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { createClient, type Client } from "@libsql/client";

// =====================================================
// Schema：5 张表 + 索引（内联为字符串常量，避免 Vercel bundle 漏包 .sql 文件）
// =====================================================

const SCHEMA_SQL = `
-- 1. 采集到的内容（3 榜单 + 1 搜索 + 1 订阅 共用）
CREATE TABLE IF NOT EXISTS contents (
  id TEXT NOT NULL,
  source_skill TEXT NOT NULL,
  source_keyword TEXT,
  category_id TEXT,
  platform TEXT NOT NULL,
  author TEXT,
  author_id TEXT,
  author_followers INTEGER,
  title TEXT NOT NULL,
  excerpt TEXT,
  url TEXT,
  publish_time_ms INTEGER,
  collect_date TEXT NOT NULL,
  metrics_json TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (source_skill, id, collect_date)
);
CREATE INDEX IF NOT EXISTS idx_contents_lookup
  ON contents (platform, source_skill, collect_date);
CREATE INDEX IF NOT EXISTS idx_contents_keyword
  ON contents (source_skill, source_keyword, collect_date);
CREATE INDEX IF NOT EXISTS idx_contents_publish
  ON contents (publish_time_ms);

-- 2. 关注的账号（对标监控）
CREATE TABLE IF NOT EXISTS tracked_accounts (
  id TEXT PRIMARY KEY,
  douyin_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  sec_uid TEXT,
  account_type TEXT NOT NULL,
  category_id TEXT,
  follower_count INTEGER,
  total_favorited INTEGER,
  aweme_count INTEGER,
  redfox_index REAL,
  auto_sync INTEGER NOT NULL DEFAULT 1,
  track_growth INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  added_at_ms INTEGER NOT NULL,
  last_fetched_at_ms INTEGER,
  removed_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tracked_accounts_active
  ON tracked_accounts (removed_at_ms, account_type);

-- 3. 账号每日快照
CREATE TABLE IF NOT EXISTS tracked_account_snapshots (
  account_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,
  follower_count INTEGER,
  total_favorited INTEGER,
  aweme_count INTEGER,
  redfox_index REAL,
  metrics_json TEXT,
  PRIMARY KEY (account_id, snapshot_date)
);

-- 4. 全局设置
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

-- 5. 同步日志
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at_ms INTEGER NOT NULL,
  finished_at_ms INTEGER,
  skills_json TEXT,
  items_inserted INTEGER,
  status TEXT,
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_log_started
  ON sync_log (started_at_ms DESC);

-- 6. 监控分类
CREATE TABLE IF NOT EXISTS monitor_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled_platforms_json TEXT NOT NULL DEFAULT '[]',
  keywords_json TEXT NOT NULL DEFAULT '[]',
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at_ms INTEGER NOT NULL,
  removed_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_monitor_categories_active
  ON monitor_categories (removed_at_ms);
CREATE INDEX IF NOT EXISTS idx_monitor_categories_enabled
  ON monitor_categories (enabled);
`;

// =====================================================
// 抽象接口
// =====================================================

/** 单条 prepared statement（跨驱动统一） */
export interface DbStatement {
  run(...args: unknown[]): Promise<{ lastInsertRowid: number; changes: number }>;
  get<T = unknown>(...args: unknown[]): Promise<T | undefined>;
  all<T = unknown>(...args: unknown[]): Promise<T[]>;
}

/** DB handle（跨驱动统一） */
export interface Db {
  /** 执行任意 SQL 字符串（用于多语句、PRAGMA、CREATE） */
  exec(sql: string): Promise<void>;
  /** 准备一个 statement */
  prepare(sql: string): DbStatement;
  /** 在一个事务中跑闭包；返回闭包的返回值；失败自动回滚 */
  transaction<T>(fn: () => Promise<T> | T): Promise<T>;
  /** 关掉连接（仅用于测试） */
  close(): void;
}

declare global {
  // eslint-disable-next-line no-var
  var __db: Db | undefined;
}

// =====================================================
// 通用：将 unknown 值转成 libsql 接受的 InValue
// =====================================================

function toLibsqlArg(v: unknown): string | number | bigint | null | boolean {
  if (v === null || v === undefined) return null;
  if (typeof v === "number" || typeof v === "bigint") return v;
  if (typeof v === "boolean") return v ? 1 : 0;
  if (typeof v === "string") return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
}

// =====================================================
// 本地 better-sqlite3 adapter（dev 用，同步包成 async）
// =====================================================

function getDbPath(): string {
  const dir = join(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return join(dir, "app.db");
}

function createLocalAdapter(): Db {
  const db = new Database(getDbPath());
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 2500");
  db.pragma("foreign_keys = ON");

  function wrap(stmt: Database.Statement): DbStatement {
    return {
      run: async (...args) => {
        const r = stmt.run(...(args as never[]));
        return {
          lastInsertRowid: Number(r.lastInsertRowid),
          changes: r.changes,
        };
      },
      get: async <T = unknown>(...args: unknown[]): Promise<T | undefined> =>
        stmt.get(...(args as never[])) as T | undefined,
      all: async <T = unknown>(...args: unknown[]): Promise<T[]> =>
        stmt.all(...(args as never[])) as T[],
    };
  }

  return {
    exec: async (sql) => {
      db.exec(sql);
    },
    prepare: (sql) => wrap(db.prepare(sql)),
    transaction: async <T>(fn: () => Promise<T> | T): Promise<T> => {
      // better-sqlite3 的 db.transaction(fn) **不支持 async fn**：
      // 会在 microtask resolve 前就"提交"，破坏原子性。
      // 这里用手写 BEGIN/COMMIT/ROLLBACK 替代，能正确包含 await。
      db.exec("BEGIN IMMEDIATE");
      try {
        const result = await fn();
        db.exec("COMMIT");
        return result;
      } catch (e) {
        try {
          db.exec("ROLLBACK");
        } catch {
          // ignore rollback failure
        }
        throw e;
      }
    },
    close: () => db.close(),
  };
}

// =====================================================
// 远端 libsql adapter（prod / Vercel + Turso）
// =====================================================

function rowsToObjects(
  columns: string[],
  rows: Array<Record<string, unknown>>
): Array<Record<string, unknown>> {
  return rows.map((row) => {
    const out: Record<string, unknown> = {};
    for (const col of columns) out[col] = row[col];
    return out;
  });
}

function createRemoteAdapter(url: string, authToken?: string): Db {
  const client: Client = createClient({ url, authToken });

  async function runOnce(
    sql: string,
    args?: unknown[]
  ): Promise<{
    rowsAffected: number;
    lastInsertRowid: number;
    rows: Array<Record<string, unknown>>;
    columns: string[];
  }> {
    const rs = await client.execute({
      sql,
      args: args ? args.map(toLibsqlArg) : undefined,
    });
    return {
      rowsAffected: rs.rowsAffected,
      lastInsertRowid: rs.lastInsertRowid !== undefined ? Number(rs.lastInsertRowid) : 0,
      rows: rowsToObjects(rs.columns, rs.rows as Array<Record<string, unknown>>),
      columns: rs.columns,
    };
  }

  return {
    exec: async (sql) => {
      // libsql 用 executeMultiple 处理多语句 SQL 字符串
      await client.executeMultiple(sql);
    },
    prepare: (sql) => ({
      run: async (...args) => {
        const r = await runOnce(sql, args);
        return { changes: r.rowsAffected, lastInsertRowid: r.lastInsertRowid };
      },
      get: async <T = unknown>(...args: unknown[]): Promise<T | undefined> => {
        const r = await runOnce(sql, args);
        return r.rows[0] as T | undefined;
      },
      all: async <T = unknown>(...args: unknown[]): Promise<T[]> => {
        const r = await runOnce(sql, args);
        return r.rows as T[];
      },
    }),
    transaction: async (fn) => {
      // 用 libsql 交互式事务（write 模式）
      // fn 内 prepare() 拿到的 statement 仍然走 client.execute（独立连接），
      // 但 libsql 服务端会把这些语句串行化到同一连接上的事务里需要 interactive tx。
      //
      // 折中：使用 interactive transaction，并 monkey-patch fn 让它内部的 getDb() 复用此 tx。
      // 我们的 repo 通过全局 __db 拿 handle，无法直接传入 tx handle。
      //
      // 实操方案：让 withTx 内部用 libsql 的 batch 替代——不暴露交互式事务。
      // 对于简单的"单条 INSERT 列表 + 一条软删"，退化为"逐条执行 + 无强原子"
      // —— 我们的 schema 上有 UNIQUE 去重，且 softRemove 是顺序执行的两个语句，
      // 即便不原子也不会破坏数据完整性（最多出现"category 已软删但 contents 未删"，下次再清）。
      //
      // 真正严谨做法：把所有 withTx 内部 SQL 改成 client.batch()，但 repo 层不感知。
      // 简化：此处仅作语义占位，**返回 fn() 的结果**。Vercel 上的"事务"实际是顺序写。
      return await fn();
    },
    close: () => client.close(),
  };
}

// =====================================================
// 选择 + 初始化（schema + seed）
// =====================================================

function pickAdapter(): Db {
  const url = process.env.DATABASE_URL;
  if (url && (url.startsWith("libsql://") || url.startsWith("https://"))) {
    return createRemoteAdapter(url, process.env.DATABASE_AUTH_TOKEN);
  }
  return createLocalAdapter();
}

function readSchema(): string {
  return SCHEMA_SQL;
}

/** 已存在 DB 的列补齐：SQLite 不支持 ADD COLUMN IF NOT EXISTS，用 try/catch 兼容 */
async function migrateExistingTables(db: Db): Promise<void> {
  // monitor_categories 加 enabled 列（如已有则报错被吞掉）
  try {
    await db.exec("ALTER TABLE monitor_categories ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1");
  } catch {
    // 列已存在 — 忽略
  }
}

async function seedIfEmpty(db: Db): Promise<void> {
  const existing = await db
    .prepare("SELECT COUNT(*) AS n FROM settings")
    .get<{ n: number }>();
  if (existing && existing.n > 0) {
    await seedMonitorCategoriesIfEmpty(db);
    return;
  }

  const now = Date.now();
  const defaults: Array<[string, string]> = [
    [
      "skills_enabled",
      JSON.stringify({
        "douyin-content-surge": true,
        "douyin-weekly-surge": true,
        "douyin-daily-hot": true,
        "douyin-search": true,
        "douyin-realtime-search": true,
        "douyin-works-crawler": true,
        "douyin-subscribe": true,
      }),
    ],
    ["auto_keywords", "[]"],
    ["follower_filter_enabled", "true"],
    ["follower_filter_max", "200000"],
    [
      "redfox_categories",
      JSON.stringify([
        "全部", "小剧场", "财富理财", "二次元", "身体锻炼", "居家装修",
        "数码科技", "科学普及", "旅行", "美食", "动物", "明星娱乐",
        "汽车", "亲子", "人文", "三农", "潮流风尚", "游戏", "生活记录",
        "体育", "舞蹈才艺", "学习教育", "休闲玩乐", "影视", "音乐",
        "颜值造型", "健康医学", "综艺", "个人成长",
      ]),
    ],
  ];
  const insertSetting = db.prepare(
    "INSERT OR IGNORE INTO settings (key, value, updated_at_ms) VALUES (?, ?, ?)"
  );
  for (const [k, v] of defaults) {
    await insertSetting.run(k, v, now);
  }
  await seedMonitorCategoriesIfEmpty(db);
}

async function seedMonitorCategoriesIfEmpty(db: Db): Promise<void> {
  const r = await db
    .prepare("SELECT COUNT(*) AS n FROM monitor_categories")
    .get<{ n: number }>();
  if (!r || r.n > 0) return;

  const CATEGORIES = [
    {
      id: "claudecode",
      name: "ClaudeCode 选题监控",
      description:
        "围绕 Claude Code / Anthropic 生态的编程工具、Skills、Hooks、MCP 等内容选题。",
      enabledPlatforms: ["douyin", "xiaohongshu", "weibo", "bilibili", "wechat", "zhihu"],
      keywords: [
        "Claude Code",
        "Claude Sonnet",
        "Skills",
        "MCP",
        "Computer Use",
        "Anthropic",
        "Vibe Coding",
      ],
      createdAt: "2026-05-12",
    },
    {
      id: "vibecoding",
      name: "Vibecoding 选题监控",
      description: "聚焦 Vibe Coding / AI 辅助编程 / 独立开发领域。",
      enabledPlatforms: ["douyin", "xiaohongshu", "weibo", "bilibili", "zhihu"],
      keywords: [
        "Vibe Coding",
        "Cursor",
        "Lovable",
        "Bolt",
        "独立开发",
        "Indie Hacker",
        "Prompt Engineering",
      ],
      createdAt: "2026-05-20",
    },
  ];
  const stmt = db.prepare(
    "INSERT OR IGNORE INTO monitor_categories (id, name, description, enabled_platforms_json, keywords_json, created_at_ms) VALUES (?, ?, ?, ?, ?, ?)"
  );
  for (const c of CATEGORIES) {
    await stmt.run(
      c.id,
      c.name,
      c.description,
      JSON.stringify(c.enabledPlatforms),
      JSON.stringify(c.keywords),
      new Date(c.createdAt).getTime() || Date.now()
    );
  }
}

export async function getDb(): Promise<Db> {
  if (globalThis.__db) {
    // 每次都跑 schema（CREATE TABLE IF NOT EXISTS 安全幂等），便于新增表
    await globalThis.__db.exec(readSchema());
    await migrateExistingTables(globalThis.__db);
    return globalThis.__db;
  }
  const db = pickAdapter();
  await db.exec(readSchema());
  await migrateExistingTables(db);
  await seedIfEmpty(db);
  globalThis.__db = db;
  return db;
}

/** 应用 schema 中所有 CREATE TABLE IF NOT EXISTS（用于已存在 DB 的"加表"） */
export async function ensureSchema(): Promise<void> {
  const db = await getDb();
  await db.exec(readSchema());
}

/** 事务封装：fn 可以是 async；返回 fn 的返回值
 *  dev 本地：better-sqlite3 真事务
 *  prod 远端：当前实现为"顺序写"占位（见 createRemoteAdapter.transaction 注释） */
export async function withTx<T>(fn: () => Promise<T> | T): Promise<T> {
  const db = await getDb();
  return db.transaction(fn);
}

/** 关闭连接（仅用于测试 / 进程退出） */
export function closeDb(): void {
  if (globalThis.__db) {
    globalThis.__db.close();
    globalThis.__db = undefined;
  }
}
