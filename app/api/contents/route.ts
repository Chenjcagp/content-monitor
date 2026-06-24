// GET /api/contents?categoryId=&platform=&sourceSkill=&date=&limit=
import { NextResponse } from "next/server";
import { query } from "@/lib/repo/contents";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const platform = url.searchParams.get("platform") ?? undefined;
  const sourceSkill = url.searchParams.get("sourceSkill") ?? undefined;
  const sourceKeyword = url.searchParams.get("sourceKeyword") ?? undefined;
  const date = url.searchParams.get("date") ?? undefined;
  const startDate = url.searchParams.get("startDate") ?? undefined;
  const endDate = url.searchParams.get("endDate") ?? undefined;
  const limit = url.searchParams.get("limit")
    ? Number(url.searchParams.get("limit"))
    : undefined;

  const items = await query({
    categoryId,
    platform,
    sourceSkill,
    sourceKeyword,
    date,
    startDate,
    endDate,
    limit,
  });
  return NextResponse.json({ ok: true, items });
}
