// GET /api/search/expand?keyword=...
// 返回拓词（基于 realtime-search 响应里 list[*].topics 字段聚合）
import { NextResponse } from "next/server";
import { run } from "@/lib/skills/douyin-realtime-search";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const keyword = (url.searchParams.get("keyword") ?? "").trim();
  if (!keyword) {
    return NextResponse.json({ ok: false, error: "keyword is required" }, { status: 400 });
  }
  try {
    const data = await run({ keyword });
    // topics 字段聚合：每条 list 都有 "deepseek,豆包,gpt,claude" 形式
    const counts = new Map<string, number>();
    for (const a of data.list ?? []) {
      if (!a.topics) continue;
      const tokens = a.topics
        .split(/[,，]/)
        .map((t) => t.trim().replace(/^#/, ""))
        .filter(Boolean);
      for (const t of tokens) {
        counts.set(t, (counts.get(t) ?? 0) + 1);
      }
    }
    const topics = [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([t]) => t)
      .filter((t) => t.toLowerCase() !== keyword.toLowerCase())
      .slice(0, 30);
    return NextResponse.json({ ok: true, topics });
  } catch (e) {
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}