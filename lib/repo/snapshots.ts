// tracked_account_snapshots 表 repo — 用于 sparkline 成长曲线

import { getDb } from "../db";

export interface Snapshot {
  account_id: string;
  snapshot_date: string;
  follower_count: number | null;
  total_favorited: number | null;
  aweme_count: number | null;
  redfox_index: number | null;
  metrics_json: string | null;
}

export async function upsert(snap: Snapshot): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      `INSERT OR REPLACE INTO tracked_account_snapshots
       (account_id, snapshot_date, follower_count, total_favorited, aweme_count, redfox_index, metrics_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      snap.account_id,
      snap.snapshot_date,
      snap.follower_count,
      snap.total_favorited,
      snap.aweme_count,
      snap.redfox_index,
      snap.metrics_json
    );
}

export async function listForAccount(
  accountId: string,
  days = 30
): Promise<Snapshot[]> {
  const db = await getDb();
  const rows = (await db
    .prepare(
      `SELECT * FROM tracked_account_snapshots
       WHERE account_id = ?
       ORDER BY snapshot_date DESC
       LIMIT ?`
    )
    .all(accountId, days)) as Snapshot[];
  return rows;
}
