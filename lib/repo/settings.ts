// settings 表 repo（key-value JSON 存储）

import { getDb } from "../db";

export type SettingsKey =
  | "skills_enabled"
  | "auto_keywords"
  | "follower_filter_enabled"
  | "follower_filter_max"
  | "redfox_categories";

export type SkillsEnabled = Record<string, boolean>;

export async function getAll(): Promise<Record<string, unknown>> {
  const db = await getDb();
  const rows = (await db.prepare("SELECT key, value FROM settings").all()) as Array<{
    key: string;
    value: string;
  }>;
  const out: Record<string, unknown> = {};
  for (const r of rows) {
    try {
      out[r.key] = JSON.parse(r.value);
    } catch {
      out[r.key] = r.value;
    }
  }
  return out;
}

export async function get<T = unknown>(
  key: SettingsKey | string,
  fallback: T
): Promise<T> {
  const db = await getDb();
  const r = await db
    .prepare("SELECT value FROM settings WHERE key = ?")
    .get<{ value: string }>(key);
  if (!r) return fallback;
  try {
    return JSON.parse(r.value) as T;
  } catch {
    return fallback;
  }
}

export async function set(key: string, value: unknown): Promise<void> {
  const db = await getDb();
  await db
    .prepare(
      "INSERT INTO settings (key, value, updated_at_ms) VALUES (?, ?, ?) " +
        "ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at_ms = excluded.updated_at_ms"
    )
    .run(key, JSON.stringify(value), Date.now());
}

// 业务封装
export const KEYWORD_CAP = 50;

export async function getAutoKeywords(): Promise<string[]> {
  return await get<string[]>("auto_keywords", []);
}

export async function setAutoKeywords(
  keywords: string[]
): Promise<{ ok: boolean; reason?: string }> {
  if (!Array.isArray(keywords)) return { ok: false, reason: "must be array" };
  if (keywords.length > KEYWORD_CAP)
    return { ok: false, reason: `超过上限 ${KEYWORD_CAP} 个` };
  await set("auto_keywords", keywords);
  return { ok: true };
}

export async function getSkillsEnabled(): Promise<SkillsEnabled> {
  return await get<SkillsEnabled>("skills_enabled", {});
}

export async function setSkillEnabled(skillId: string, enabled: boolean): Promise<void> {
  const cur = await getSkillsEnabled();
  cur[skillId] = enabled;
  await set("skills_enabled", cur);
}

export async function getFollowerFilter(): Promise<{
  enabled: boolean;
  max: number;
}> {
  return {
    enabled: await get<boolean>("follower_filter_enabled", true),
    max: await get<number>("follower_filter_max", 200000),
  };
}

export async function setFollowerFilter(
  enabled: boolean,
  max: number
): Promise<void> {
  await set("follower_filter_enabled", enabled);
  await set("follower_filter_max", max);
}

export async function getRedfoxCategories(): Promise<string[]> {
  return await get<string[]>("redfox_categories", []);
}
