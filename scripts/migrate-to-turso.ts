// 本地 data/app.db → Turso 远端数据库 全表迁移脚本
//
// 用法:
//   DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." \
//   npx tsx scripts/migrate-to-turso.ts
//
// 设计:
//  - 本地 better-sqlite3 只读打开 data/app.db，不走 lib/db.ts adapter（避免 seed/migration 副作用）
//  - 远端 @libsql/client 直连，先 executeMultiple(schema) 建表（幂等）
//  - 用 client.batch() 分批 100 条 INSERT OR IGNORE，重复跑安全
//  - 5 张表按 FK 依赖排序：settings → monitor_categories → tracked_accounts →
//    tracked_account_snapshots → contents → sync_log

import { readFileSync } from "node:fs";
import { join } from "node:path";
import Database from "better-sqlite3";
import { createClient, type InValue } from "@libsql/client";

const url = process.env.DATABASE_URL;
const authToken = process.env.DATABASE_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("缺少 DATABASE_URL 或 DATABASE_AUTH_TOKEN");
  console.error("用法:");
  console.error(
    '  DATABASE_URL="libsql://..." DATABASE_AUTH_TOKEN="..." npx tsx scripts/migrate-to-turso.ts'
  );
  process.exit(1);
}
if (!url.startsWith("libsql://") && !url.startsWith("https://")) {
  console.error("DATABASE_URL 必须以 libsql:// 或 https:// 开头");
  process.exit(1);
}

const localPath = join(process.cwd(), "data", "app.db");
const local = new Database(localPath, { readonly: true });

const remote = createClient({ url, authToken });

async function main() {
// 1. 在远端跑 schema（幂等 CREATE IF NOT EXISTS）
const schema = readFileSync(join(process.cwd(), "lib", "db-schema.sql"), "utf-8");
console.log("[1/3] 远端执行 schema...");
await remote.executeMultiple(schema);
console.log("      ✓ schema 完成");

// 2. 跑迁移 ALTER（如果 v1 旧库缺 enabled 列）
try {
  await remote.execute(
    "ALTER TABLE monitor_categories ADD COLUMN enabled INTEGER NOT NULL DEFAULT 1"
  );
  console.log("      ✓ migration: monitor_categories.enabled 已补");
} catch {
  // 列已存在 — 忽略
}

// 3. 按表迁移
type Row = Record<string, unknown>;
type Transform = (r: Row) => unknown[];

const TABLES: Array<{ name: string; transform: Transform }> = [
  {
    name: "settings",
    transform: (r) => [r.key, r.value, r.updated_at_ms],
  },
  {
    name: "monitor_categories",
    transform: (r) => [
      r.id,
      r.name,
      r.description,
      r.enabled_platforms_json,
      r.keywords_json,
      r.enabled ?? 1,
      r.created_at_ms,
      r.removed_at_ms,
    ],
  },
  {
    name: "tracked_accounts",
    transform: (r) => [
      r.id,
      r.douyin_id,
      r.display_name,
      r.sec_uid,
      r.account_type,
      r.category_id,
      r.follower_count,
      r.total_favorited,
      r.aweme_count,
      r.redfox_index,
      r.auto_sync,
      r.track_growth,
      r.notes,
      r.added_at_ms,
      r.last_fetched_at_ms,
      r.removed_at_ms,
    ],
  },
  {
    name: "tracked_account_snapshots",
    transform: (r) => [
      r.account_id,
      r.snapshot_date,
      r.follower_count,
      r.total_favorited,
      r.aweme_count,
      r.redfox_index,
      r.metrics_json,
    ],
  },
  {
    name: "contents",
    transform: (r) => [
      r.id,
      r.source_skill,
      r.source_keyword,
      r.category_id,
      r.platform,
      r.author,
      r.author_id,
      r.author_followers,
      r.title,
      r.excerpt,
      r.url,
      r.publish_time_ms,
      r.collect_date,
      r.metrics_json,
      r.tags_json,
      r.created_at_ms,
    ],
  },
  {
    name: "sync_log",
    transform: (r) => [
      r.started_at_ms,
      r.finished_at_ms,
      r.skills_json,
      r.items_inserted,
      r.status,
      r.error,
    ],
  },
];

// sync_log 表 id 是 AUTOINCREMENT；本地 row 不含 id（AUTOINCREMENT 由 SQLite 分配）。
// 用显式列名 INSERT（不写 id），让远端 AUTOINCREMENT 重新分配。
const SYNC_LOG_COLS = "(started_at_ms, finished_at_ms, skills_json, items_inserted, status, error)";

console.log("[2/3] 迁移数据...");
const counts: Record<string, number> = {};
for (const { name, transform } of TABLES) {
  const rows = local.prepare(`SELECT * FROM ${name}`).all() as Row[];
  if (!rows.length) {
    console.log(`      ${name.padEnd(30)} 0 rows`);
    counts[name] = 0;
    continue;
  }
  // 用第一行拿列数
  const placeholders = transform(rows[0]).map(() => "?").join(",");
  // sync_log 走显式列名（不包含 id AUTOINCREMENT）
  const sql = name === "sync_log"
    ? `INSERT OR IGNORE INTO sync_log ${SYNC_LOG_COLS} VALUES (${placeholders})`
    : `INSERT OR IGNORE INTO ${name} VALUES (${placeholders})`;
  const stmts = rows.map((r) => ({
    sql,
    args: transform(r) as InValue[],
  }));
  // 分批 100 条/批（libsql batch 安全上限）
  const BATCH = 100;
  let migrated = 0;
  for (let i = 0; i < stmts.length; i += BATCH) {
    await remote.batch(stmts.slice(i, i + BATCH), "write");
    migrated += Math.min(BATCH, stmts.length - i);
  }
  counts[name] = rows.length;
  console.log(`      ${name.padEnd(30)} ${rows.length} rows`);
}

// 4. 验证
console.log("[3/3] 验证...");
const check = await remote.execute("SELECT COUNT(*) AS n FROM contents");
const remoteContents = Number(check.rows[0]?.n ?? 0);

console.log("\n=== 迁移汇总 ===");
for (const [name, n] of Object.entries(counts)) {
  console.log(`  ${name.padEnd(30)} ${n} rows`);
}
console.log(`\n✓ Turso contents 表: ${remoteContents} 条 (本地 ${counts.contents} 条)`);

if (remoteContents !== counts.contents) {
  console.error(
    `\n⚠️ 行数不一致！可能是 libsql batch 截断，请重跑脚本（INSERT OR IGNORE 保证幂等）`
  );
  local.close();
  remote.close();
  process.exit(2);
}

local.close();
remote.close();
}

main().catch((e) => {
  console.error("迁移失败:", e);
  process.exit(1);
});