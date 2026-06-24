// sync_log 表 repo

import { getDb } from "../db";

export type SyncStatus = "ok" | "partial" | "failed" | "running";

export interface SyncRun {
  id: number;
  started_at_ms: number;
  finished_at_ms: number | null;
  skills_json: string | null;
  items_inserted: number | null;
  status: SyncStatus | null;
  error: string | null;
}

export async function startRun(skills: string[]): Promise<number> {
  const db = await getDb();
  const r = await db
    .prepare(
      "INSERT INTO sync_log (started_at_ms, skills_json, status) VALUES (?, ?, ?)"
    )
    .run(Date.now(), JSON.stringify(skills), "running");
  return Number(r.lastInsertRowid);
}

export async function finishRun(
  id: number,
  status: SyncStatus,
  itemsInserted: number,
  error?: string
): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      "UPDATE sync_log SET finished_at_ms = ?, status = ?, items_inserted = ?, error = ? WHERE id = ?"
    )
    .run(Date.now(), status, itemsInserted, error ?? null, id);
}

export async function recent(limit = 10): Promise<SyncRun[]> {
  const db = await getDb();
  return (await db
    .prepare("SELECT * FROM sync_log ORDER BY started_at_ms DESC LIMIT ?")
    .all(limit)) as SyncRun[];
}

export async function lastRun(): Promise<SyncRun | null> {
  const db = await getDb();
  const r = await db
    .prepare("SELECT * FROM sync_log ORDER BY started_at_ms DESC LIMIT 1")
    .get<SyncRun>();
  return r ?? null;
}

export async function pruneOlderThan(cutoffMs: number): Promise<number> {
  const db = await getDb();
  const r = await db
    .prepare("DELETE FROM sync_log WHERE started_at_ms < ?")
    .run(cutoffMs);
  return r.changes;
}
