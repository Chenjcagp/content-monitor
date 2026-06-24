// POST /api/cron/run  手动触发一次同步（按 settings 中 skills_enabled）
// Vercel Cron 通过 Authorization: Bearer <CRON_SECRET> 调用
// 手动触发（设置页"立即运行"按钮）不带 secret → 当 CRON_SECRET 已设时拒绝
//   例外：带 ?manual=1 参数时跳过鉴权（仅供本地/手动 curl 使用）
import { NextResponse } from "next/server";
import { runAll } from "@/lib/skills/run-all";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function checkAuth(req: Request): { ok: boolean; reason?: string } {
  const url = new URL(req.url);
  // 本地/CI 调试：CRON_SECRET=dev 时强制信任 ?manual=1
  const isManual = url.searchParams.get("manual") === "1";
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (!secret) {
    // 未设 CRON_SECRET → dev 模式，信任所有调用
    return { ok: true };
  }
  if (auth === `Bearer ${secret}`) {
    return { ok: true };
  }
  if (isManual && process.env.VERCEL !== "1") {
    // ?manual=1 + 非 Vercel 环境 → 跳过鉴权（用于本地/手动）
    return { ok: true };
  }
  return { ok: false, reason: "unauthorized" };
}

export async function POST(req: Request) {
  const guard = checkAuth(req);
  if (!guard.ok) {
    return NextResponse.json({ ok: false, error: guard.reason }, { status: 401 });
  }
  try {
    const result = await runAll({});
    return NextResponse.json({
      ok: true,
      runId: result.runId,
      status: result.status,
      collectDate: result.collectDate,
      totalInserted: result.totalInserted,
      skills: result.skills,
      error: result.error ?? null,
    });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

// GET 也允许触发（curl -X GET 简单）— 用于 dev
export async function GET(req: Request) {
  return POST(req);
}
