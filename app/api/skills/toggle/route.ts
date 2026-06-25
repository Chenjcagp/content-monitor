// POST /api/skills/toggle  { skillId, enabled }
import { NextResponse } from "next/server";
import { setSkillEnabled, getSkillsEnabled } from "@/lib/repo/settings";
import { SKILLS } from "@/lib/skills/types";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { skillId?: string; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const skillId = body.skillId ?? "";
  if (!SKILLS.find((s) => s.id === skillId)) {
    return NextResponse.json({ ok: false, error: "unknown skillId" }, { status: 400 });
  }
  const target = !!body.enabled;
  await setSkillEnabled(skillId, target);
  // 关键修复：写后立刻在**同一连接**上读回，保证返回的 enabled 就是刚刚写入的值
  // 避免下次请求从另一个副本读到 stale 数据让用户误以为"切回去又被改"
  const cur = await getSkillsEnabled();
  return NextResponse.json({ ok: true, skillId, enabled: cur[skillId] === true });
}
