// PATCH  /api/categories/[id]  更新 name / description / enabled_platforms / keywords
// DELETE /api/categories/[id]  软删（同时清理该 category 下的 contents）
import { NextResponse } from "next/server";
import { getById, softRemove, update } from "@/lib/repo/categories";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: { id: string } }
) {
  const cat = await getById(ctx.params.id);
  if (!cat) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const allowed: Record<string, true> = {
    name: true,
    description: true,
    enabled_platforms: true,
    keywords: true,
    enabled: true,
  };
  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(body)) if (allowed[k]) patch[k] = body[k];
  const updated = await update(ctx.params.id, patch as never);
  return NextResponse.json({ ok: true, category: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const cat = await getById(ctx.params.id);
  if (!cat) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const result = await softRemove(ctx.params.id);
  return NextResponse.json({
    ok: true,
    deleted: ctx.params.id,
    contentsDeleted: result.contentsDeleted,
  });
}
