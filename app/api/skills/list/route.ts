// GET /api/skills/list  返回 7 个 skill + 当前 enabled 状态
import { NextResponse } from "next/server";
import { SKILLS } from "@/lib/skills/types";
import { getSkillsEnabled } from "@/lib/repo/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const enabled = await getSkillsEnabled();
  return NextResponse.json({
    ok: true,
    skills: SKILLS.map((s) => ({
      ...s,
      enabled: enabled[s.id] !== false,
    })),
  });
}
