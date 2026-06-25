// 临时诊断：返回当前 DATABASE_URL、HOSTNAME、globalThis.__db 状态
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const db = await getDb();
  // 直接读 skills_enabled 行的真实值
  const r = await db.prepare("SELECT value FROM settings WHERE key = ?").get<{ value: string }>("skills_enabled");
  // 写一个新行（用时间戳），然后立刻读
  const testKey = `__diag_${Date.now()}`;
  await db.prepare("INSERT INTO settings (key, value, updated_at_ms) VALUES (?, ?, ?)").run(testKey, "write-test", Date.now());
  const r2 = await db.prepare("SELECT value FROM settings WHERE key = ?").get<{ value: string }>(testKey);
  // 清理
  await db.prepare("DELETE FROM settings WHERE key = ?").run(testKey);
  return NextResponse.json({
    ok: true,
    hostname: process.env.VERCEL_REGION ?? process.env.HOSTNAME ?? "unknown",
    db_kind: process.env.DATABASE_URL?.startsWith("libsql://") ? "remote" : "local",
    db_url_prefix: process.env.DATABASE_URL?.slice(0, 30),
    skills_enabled_raw: r?.value?.slice(0, 200),
    diag_write_then_read: r2?.value,
    diag_passed: r2?.value === "write-test",
  });
}
