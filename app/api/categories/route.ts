// GET  /api/categories        列出 active 监控分类
// POST /api/categories        新增 { id?, name, description?, enabled_platforms?, keywords? }
import { NextResponse } from "next/server";
import { add, listActive } from "@/lib/repo/categories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const categories = await listActive();
  return NextResponse.json({ ok: true, categories });
}

export async function POST(req: Request) {
  let body: {
    id?: string;
    name?: string;
    description?: string;
    enabled_platforms?: string[];
    keywords?: string[];
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const name = String(body.name ?? "").trim();
  if (!name) {
    return NextResponse.json({ ok: false, error: "name is required" }, { status: 400 });
  }
  const cat = await add({
    id: body.id,
    name,
    description: body.description,
    enabled_platforms: body.enabled_platforms,
    keywords: body.keywords,
  });
  return NextResponse.json({ ok: true, category: cat });
}
