import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function GET() {
  const db = await getDb();
  const r = await db.prepare("SELECT value FROM settings WHERE key = ?").get<{ value: string }>("skills_enabled");
  const testKey = `__diag_${Date.now()}`;
  await db.prepare("INSERT INTO settings (key, value, updated_at_ms) VALUES (?, ?, ?)").run(testKey, "write-test", Date.now());
  const r2 = await db.prepare("SELECT value FROM settings WHERE key = ?").get<{ value: string }>(testKey);
  await db.prepare("DELETE FROM settings WHERE key = ?").run(testKey);
  return NextResponse.json({
    ok: true,
    hostname: process.env.VERCEL_REGION ?? "unknown",
    skills_enabled_raw: r?.value?.slice(0, 200),
    diag_passed: r2?.value === "write-test",
  });
}
