// POST /api/cron/backfill?days=30  回填 leaderboards
import { NextResponse } from "next/server";
import { backfill } from "@/lib/skills/run-all";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const url = new URL(req.url);
  const days = Math.min(90, Math.max(1, Number(url.searchParams.get("days")) || 30));
  try {
    const runs = await backfill(days);
    const totalInserted = runs.reduce((s, r) => s + r.totalInserted, 0);
    return NextResponse.json({
      ok: true,
      days: runs.length,
      totalInserted,
      runs: runs.map((r) => ({
        collectDate: r.collectDate,
        status: r.status,
        totalInserted: r.totalInserted,
      })),
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}