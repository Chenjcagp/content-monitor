// GET /api/cron/status  返回最近 N 条 sync_log + 关键统计
import { NextResponse } from "next/server";
import { recent } from "@/lib/repo/sync-log";
import { bySourceCount, totalCount, latestCollectDate } from "@/lib/repo/contents";
import { SKILLS } from "@/lib/skills/types";
import { getSkillsEnabled } from "@/lib/repo/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const [runs, totalContents, bySource, skillsEnabled, ...latestDates] = await Promise.all([
    recent(20),
    totalCount(),
    bySourceCount(),
    getSkillsEnabled(),
    ...SKILLS.map((s) => latestCollectDate(s.id)),
  ]);
  const latestDate: Record<string, string | null> = {};
  SKILLS.forEach((s, i) => {
    latestDate[s.id] = latestDates[i];
  });
  return NextResponse.json({
    ok: true,
    runs,
    totalContents,
    bySource,
    latestDate,
    skillsEnabled,
  });
}
