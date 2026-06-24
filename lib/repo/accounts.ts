// tracked_accounts 表 repo

import { getDb } from "../db";
import { randomUUID } from "node:crypto";

export type AccountType = "compete" | "similar" | "follow";

export interface TrackedAccount {
  id: string;
  douyin_id: string;
  display_name: string | null;
  sec_uid: string | null;
  account_type: AccountType;
  category_id: string | null;
  follower_count: number | null;
  total_favorited: number | null;
  aweme_count: number | null;
  redfox_index: number | null;
  auto_sync: 0 | 1;
  track_growth: 0 | 1;
  notes: string | null;
  added_at_ms: number;
  last_fetched_at_ms: number | null;
  removed_at_ms: number | null;
}

export interface NewAccountInput {
  douyin_id: string;
  display_name?: string | null;
  sec_uid?: string | null;
  account_type: AccountType;
  category_id?: string | null;
  follower_count?: number | null;
  total_favorited?: number | null;
  aweme_count?: number | null;
  redfox_index?: number | null;
  auto_sync?: boolean;
  track_growth?: boolean;
  notes?: string | null;
}

function toAccount(r: Record<string, unknown>): TrackedAccount {
  return {
    id: r.id as string,
    douyin_id: r.douyin_id as string,
    display_name: (r.display_name as string | null) ?? null,
    sec_uid: (r.sec_uid as string | null) ?? null,
    account_type: r.account_type as AccountType,
    category_id: (r.category_id as string | null) ?? null,
    follower_count: (r.follower_count as number | null) ?? null,
    total_favorited: (r.total_favorited as number | null) ?? null,
    aweme_count: (r.aweme_count as number | null) ?? null,
    redfox_index: (r.redfox_index as number | null) ?? null,
    auto_sync: ((r.auto_sync as number) ?? 1) === 1 ? 1 : 0,
    track_growth: ((r.track_growth as number) ?? 1) === 1 ? 1 : 0,
    notes: (r.notes as string | null) ?? null,
    added_at_ms: r.added_at_ms as number,
    last_fetched_at_ms: (r.last_fetched_at_ms as number | null) ?? null,
    removed_at_ms: (r.removed_at_ms as number | null) ?? null,
  };
}

export async function listActive(): Promise<TrackedAccount[]> {
  const db = await getDb();
  const rows = (await db
    .prepare(
      "SELECT * FROM tracked_accounts WHERE removed_at_ms IS NULL ORDER BY added_at_ms DESC"
    )
    .all()) as Record<string, unknown>[];
  return rows.map(toAccount);
}

export async function getById(id: string): Promise<TrackedAccount | null> {
  const db = await getDb();
  const r = await db.prepare("SELECT * FROM tracked_accounts WHERE id = ?").get(id);
  return r ? toAccount(r as Record<string, unknown>) : null;
}

export async function getByDouyinId(douyinId: string): Promise<TrackedAccount | null> {
  const db = await getDb();
  const r = await db
    .prepare("SELECT * FROM tracked_accounts WHERE douyin_id = ?")
    .get(douyinId);
  return r ? toAccount(r as Record<string, unknown>) : null;
}

export async function add(input: NewAccountInput): Promise<TrackedAccount> {
  const db = await getDb();
  const now = Date.now();
  const id = randomUUID();
  await db
    .prepare(
      `INSERT INTO tracked_accounts
       (id, douyin_id, display_name, sec_uid, account_type, category_id,
        follower_count, total_favorited, aweme_count, redfox_index,
        auto_sync, track_growth, notes, added_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.douyin_id,
      input.display_name ?? null,
      input.sec_uid ?? null,
      input.account_type,
      input.category_id ?? null,
      input.follower_count ?? null,
      input.total_favorited ?? null,
      input.aweme_count ?? null,
      input.redfox_index ?? null,
      input.auto_sync === false ? 0 : 1,
      input.track_growth === false ? 0 : 1,
      input.notes ?? null,
      now
    );
  return (await getById(id))!;
}

export async function update(
  id: string,
  patch: Partial<NewAccountInput>
): Promise<void> {
  const db = await getDb();
  const fields: string[] = [];
  const args: unknown[] = [];
  const map: Record<string, string> = {
    display_name: "display_name",
    sec_uid: "sec_uid",
    account_type: "account_type",
    category_id: "category_id",
    follower_count: "follower_count",
    total_favorited: "total_favorited",
    aweme_count: "aweme_count",
    redfox_index: "redfox_index",
    auto_sync: "auto_sync",
    track_growth: "track_growth",
    notes: "notes",
  };
  for (const [k, v] of Object.entries(patch)) {
    if (k in map) {
      fields.push(`${map[k]} = ?`);
      // booleans → 0/1
      if (k === "auto_sync" || k === "track_growth") {
        args.push(v ? 1 : 0);
      } else {
        args.push(v);
      }
    }
  }
  if (!fields.length) return;
  args.push(id);
  await db
    .prepare(`UPDATE tracked_accounts SET ${fields.join(", ")} WHERE id = ?`)
    .run(...args);
}

export async function softRemove(id: string): Promise<void> {
  const db = await getDb();
  await db
    .prepare("UPDATE tracked_accounts SET removed_at_ms = ? WHERE id = ?")
    .run(Date.now(), id);
}

export async function hardRemove(id: string): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM tracked_accounts WHERE id = ?").run(id);
  await db.prepare("DELETE FROM tracked_account_snapshots WHERE account_id = ?").run(id);
}

// 给 works-crawler 跑完时更新账号基础信息
export async function updateFromCrawler(
  douyinId: string,
  data: {
    display_name?: string;
    sec_uid?: string;
    follower_count?: number;
    total_favorited?: number;
    aweme_count?: number;
    redfox_index?: number;
  }
): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `UPDATE tracked_accounts
       SET display_name = COALESCE(?, display_name),
           sec_uid = COALESCE(?, sec_uid),
           follower_count = COALESCE(?, follower_count),
           total_favorited = COALESCE(?, total_favorited),
           aweme_count = COALESCE(?, aweme_count),
           redfox_index = COALESCE(?, redfox_index),
           last_fetched_at_ms = ?
       WHERE douyin_id = ?`
    )
    .run(
      data.display_name ?? null,
      data.sec_uid ?? null,
      data.follower_count ?? null,
      data.total_favorited ?? null,
      data.aweme_count ?? null,
      data.redfox_index ?? null,
      Date.now(),
      douyinId
    );
}
