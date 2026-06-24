// GET /api/search/realtime?keyword=...&sortType=1&publishTime=7&offset=0
// 实时搜索：直接调 douyin-realtime-search，**不入库**
import { NextResponse } from "next/server";
import { run } from "@/lib/skills/douyin-realtime-search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const keyword = (url.searchParams.get("keyword") ?? "").trim();
  if (!keyword) {
    return NextResponse.json({ ok: false, error: "keyword is required" }, { status: 400 });
  }
  const sortType = (url.searchParams.get("sortType") ?? "1") as "1" | "2" | "3";
  const publishTime = (url.searchParams.get("publishTime") ?? "7") as "0" | "7" | "30" | "90";
  const offset = Number(url.searchParams.get("offset") ?? 0);

  try {
    const data = await run({ keyword, sortType, publishTime, offset });
    return NextResponse.json({ ok: true, ...data });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}