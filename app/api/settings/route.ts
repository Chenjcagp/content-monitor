// GET /api/settings
// PUT /api/settings  { auto_keywords?: string[], follower_filter_enabled?: boolean, follower_filter_max?: number }
import { NextResponse } from "next/server";
import {
  getAll,
  getAutoKeywords,
  getFollowerFilter,
  setAutoKeywords,
  setFollowerFilter,
  KEYWORD_CAP,
} from "@/lib/repo/settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({
    ok: true,
    all: await getAll(),
    auto_keywords: await getAutoKeywords(),
    follower_filter: await getFollowerFilter(),
    keyword_cap: KEYWORD_CAP,
  });
}

export async function PUT(req: Request) {
  let body: {
    auto_keywords?: string[];
    follower_filter_enabled?: boolean;
    follower_filter_max?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }

  if (body.auto_keywords !== undefined) {
    const r = await setAutoKeywords(body.auto_keywords);
    if (!r.ok) {
      return NextResponse.json({ ok: false, error: r.reason }, { status: 400 });
    }
  }
  if (
    body.follower_filter_enabled !== undefined ||
    body.follower_filter_max !== undefined
  ) {
    const cur = await getFollowerFilter();
    const enabled =
      body.follower_filter_enabled !== undefined
        ? !!body.follower_filter_enabled
        : cur.enabled;
    const max =
      body.follower_filter_max !== undefined
        ? Math.max(0, Math.floor(Number(body.follower_filter_max)))
        : cur.max;
    await setFollowerFilter(enabled, max);
  }
  return NextResponse.json({ ok: true });
}
