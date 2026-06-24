// POST /api/skills/toggle  { skillId, enabled }
import { NextResponse } from "next/server";
import { setSkillEnabled } from "@/lib/repo/settings";
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
  await setSkillEnabled(skillId, !!body.enabled);
  return NextResponse.json({ ok: true });
}
