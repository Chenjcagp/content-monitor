// contents 表 repo
// 采集入库 + 按条件查询 + 30 天清理

import { getDb, withTx } from "../db";

export interface ContentRow {
  id: string;
  source_skill: string;
  source_keyword: string | null;
  category_id: string | null;
  platform: string;
  author: string | null;
  author_id: string | null;
  author_followers: number | null;
  title: string;
  excerpt: string | null;
  url: string;
  publish_time_ms: number | null;
  collect_date: string;
  metrics: {
    likeCount: number;
    commentCount: number;
    shareCount: number;
    collectCount: number;
  };
  tags: string[];
  created_at_ms: number;
}

export interface InsertContentInput {
  id: string;
  source_skill: string;
  source_keyword?: string | null;
  category_id?: string | null;
  platform: string;
  author?: string | null;
  author_id?: string | null;
  author_followers?: number | null;
  title: string;
  excerpt?: string | null;
  url: string;
  publish_time_ms?: number | null;
  collect_date: string;
  metrics: ContentRow["metrics"];
  tags?: string[];
}

export async function insertMany(rows: InsertContentInput[]): Promise<number> {
  if (!rows.length) return 0;
  const db = await getDb();
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO contents
    (id, source_skill, source_keyword, category_id, platform, author, author_id, author_followers,
     title, excerpt, url, publish_time_ms, collect_date, metrics_json, tags_json, created_at_ms)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const now = Date.now();
  let inserted = 0;
  await withTx(async () => {
    for (const r of rows) {
      const res = await stmt.run(
        r.id,
        r.source_skill,
        r.source_keyword ?? null,
        r.category_id ?? null,
        r.platform,
        r.author ?? null,
        r.author_id ?? null,
        r.author_followers ?? null,
        r.title,
        r.excerpt ?? null,
        r.url,
        r.publish_time_ms ?? null,
        r.collect_date,
        JSON.stringify(r.metrics),
        JSON.stringify(r.tags ?? []),
        now
      );
      if (res.changes > 0) inserted += res.changes;
    }
  });
  return inserted;
}

export interface QueryContentsParams {
  categoryId?: string;
  platform?: string | "all";
  sourceSkill?: string;
  sourceKeyword?: string;
  date?: string; // 'YYYY-MM-DD'
  startDate?: string;
  endDate?: string;
  limit?: number;
}

export async function query(params: QueryContentsParams = {}): Promise<ContentRow[]> {
  const db = await getDb();
  const where: string[] = [];
  const args: unknown[] = [];

  if (params.categoryId) {
    where.push("category_id = ?");
    args.push(params.categoryId);
  }
  if (params.platform && params.platform !== "all") {
    where.push("platform = ?");
    args.push(params.platform);
  }
  if (params.sourceSkill) {
    where.push("source_skill = ?");
    args.push(params.sourceSkill);
  }
  if (params.sourceKeyword) {
    where.push("source_keyword = ?");
    args.push(params.sourceKeyword);
  }
  if (params.date) {
    where.push("collect_date = ?");
    args.push(params.date);
  }
  if (params.startDate) {
    where.push("collect_date >= ?");
    args.push(params.startDate);
  }
  if (params.endDate) {
    where.push("collect_date <= ?");
    args.push(params.endDate);
  }

  const whereClause = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const limitClause = params.limit ? `LIMIT ${Math.floor(params.limit)}` : "";

  const sql = `SELECT * FROM contents ${whereClause} ORDER BY publish_time_ms DESC ${limitClause}`;
  const raw = (await db.prepare(sql).all(...args)) as Array<
    Omit<ContentRow, "metrics" | "tags"> & { metrics_json: string; tags_json: string }
  >;

  return raw.map((r) => ({
    ...r,
    metrics: JSON.parse(r.metrics_json),
    tags: JSON.parse(r.tags_json),
  }));
}

export async function countByDate(
  startDate: string,
  endDate: string
): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = (await db
    .prepare(
      `SELECT collect_date, COUNT(*) AS n FROM contents
       WHERE collect_date >= ? AND collect_date <= ?
       GROUP BY collect_date`
    )
    .all(startDate, endDate)) as Array<{ collect_date: string; n: number }>;
  const out: Record<string, number> = {};
  for (const r of rows) out[r.collect_date] = r.n;
  return out;
}

export async function pruneOlderThan(cutoffDate: string): Promise<number> {
  const db = await getDb();
  const res = await db.prepare("DELETE FROM contents WHERE collect_date < ?").run(cutoffDate);
  return res.changes;
}

export async function totalCount(): Promise<number> {
  const db = await getDb();
  const r = await db.prepare("SELECT COUNT(*) AS n FROM contents").get<{ n: number }>();
  return r?.n ?? 0;
}

export async function bySourceCount(): Promise<Record<string, number>> {
  const db = await getDb();
  const rows = (await db
    .prepare("SELECT source_skill, COUNT(*) AS n FROM contents GROUP BY source_skill")
    .all()) as Array<{ source_skill: string; n: number }>;
  const out: Record<string, number> = {};
  for (const r of rows) out[r.source_skill] = r.n;
  return out;
}

export async function latestCollectDate(sourceSkill: string): Promise<string | null> {
  const db = await getDb();
  const r = await db
    .prepare("SELECT MAX(collect_date) AS d FROM contents WHERE source_skill = ?")
    .get<{ d: string | null }>(sourceSkill);
  return r?.d ?? null;
}
