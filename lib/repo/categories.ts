// monitor_categories 表 repo
// 替代 mockData 中的 CATEGORIES 内存数据 — 提供 CRUD + 软删

import { getDb, withTx } from "../db";

export interface MonitorCategory {
  id: string;
  name: string;
  description: string | null;
  enabled_platforms: string[];
  keywords: string[];
  enabled: 0 | 1;
  created_at_ms: number;
  removed_at_ms: number | null;
}

export interface NewCategoryInput {
  id?: string;
  name: string;
  description?: string;
  enabled_platforms?: string[];
  keywords?: string[];
  enabled?: boolean;
}

function toCategory(r: Record<string, unknown>): MonitorCategory {
  return {
    id: r.id as string,
    name: r.name as string,
    description: (r.description as string | null) ?? null,
    enabled_platforms: r.enabled_platforms_json
      ? (JSON.parse(r.enabled_platforms_json as string) as string[])
      : [],
    keywords: r.keywords_json
      ? (JSON.parse(r.keywords_json as string) as string[])
      : [],
    enabled: ((r.enabled as number) ?? 1) === 1 ? 1 : 0,
    created_at_ms: r.created_at_ms as number,
    removed_at_ms: (r.removed_at_ms as number | null) ?? null,
  };
}

function slugify(name: string): string {
  const ascii = name
    .toLowerCase()
    .replace(/[^a-z0-9一-龥]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (/^[a-z0-9][a-z0-9-]*$/.test(ascii) && /[a-z0-9]/.test(ascii)) return ascii;
  const hash = Array.from(name).reduce((s, c) => s + c.charCodeAt(0).toString(16), "");
  return `cat-${(hash.slice(-12) || "0")}`;
}

export async function listActive(): Promise<MonitorCategory[]> {
  const db = await getDb();
  const rows = (await db
    .prepare(
      "SELECT * FROM monitor_categories WHERE removed_at_ms IS NULL ORDER BY created_at_ms ASC"
    )
    .all()) as Record<string, unknown>[];
  return rows.map(toCategory);
}

export async function getById(id: string): Promise<MonitorCategory | null> {
  const db = await getDb();
  const r = await db
    .prepare(
      "SELECT * FROM monitor_categories WHERE id = ? AND removed_at_ms IS NULL"
    )
    .get(id);
  return r ? toCategory(r as Record<string, unknown>) : null;
}

export async function add(input: NewCategoryInput): Promise<MonitorCategory> {
  const db = await getDb();
  const now = Date.now();
  const id = input.id && /^[a-z0-9][a-z0-9-]*$/.test(input.id) ? input.id : slugify(input.name);
  await db
    .prepare(
      `INSERT OR IGNORE INTO monitor_categories
       (id, name, description, enabled_platforms_json, keywords_json, enabled, created_at_ms)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
      id,
      input.name.trim(),
      input.description ?? null,
      JSON.stringify(input.enabled_platforms ?? ["douyin"]),
      JSON.stringify(input.keywords ?? []),
      input.enabled === false ? 0 : 1,
      now
    );
  const created = await getById(id);
  if (!created) {
    const newId = `${id}-${now.toString(36)}`;
    await db
      .prepare(
        `INSERT INTO monitor_categories
         (id, name, description, enabled_platforms_json, keywords_json, enabled, created_at_ms)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        newId,
        input.name.trim(),
        input.description ?? null,
        JSON.stringify(input.enabled_platforms ?? ["douyin"]),
        JSON.stringify(input.keywords ?? []),
        input.enabled === false ? 0 : 1,
        now
      );
    return (await getById(newId))!;
  }
  return created;
}

export async function update(
  id: string,
  patch: Partial<NewCategoryInput>
): Promise<MonitorCategory | null> {
  const cur = await getById(id);
  if (!cur) return null;
  const fields: string[] = [];
  const args: unknown[] = [];
  if (patch.name !== undefined) {
    fields.push("name = ?");
    args.push(patch.name.trim());
  }
  if (patch.description !== undefined) {
    fields.push("description = ?");
    args.push(patch.description ?? null);
  }
  if (patch.enabled_platforms !== undefined) {
    fields.push("enabled_platforms_json = ?");
    args.push(JSON.stringify(patch.enabled_platforms));
  }
  if (patch.keywords !== undefined) {
    fields.push("keywords_json = ?");
    args.push(JSON.stringify(patch.keywords));
  }
  if (patch.enabled !== undefined) {
    fields.push("enabled = ?");
    args.push(patch.enabled ? 1 : 0);
  }
  if (!fields.length) return cur;
  args.push(id);
  const db = await getDb();
  await db
    .prepare(`UPDATE monitor_categories SET ${fields.join(", ")} WHERE id = ?`)
    .run(...args);
  return await getById(id);
}

/** 软删：标记 removed_at_ms；同时清理关联的 contents 数据 */
export async function softRemove(
  id: string
): Promise<{ contentsDeleted: number }> {
  const db = await getDb();
  const cat = await getById(id);
  if (!cat) return { contentsDeleted: 0 };

  let contentsDeleted = 0;
  await withTx(async () => {
    await db
      .prepare(
        "UPDATE monitor_categories SET removed_at_ms = ? WHERE id = ?"
      )
      .run(Date.now(), id);
    const res = await db
      .prepare("DELETE FROM contents WHERE category_id = ?")
      .run(id);
    contentsDeleted = res.changes;
  });
  return { contentsDeleted };
}

/** 硬删（仅测试用） */
export async function hardRemove(id: string): Promise<void> {
  const db = await getDb();
  await db.prepare("DELETE FROM monitor_categories WHERE id = ?").run(id);
}
