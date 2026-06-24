// PATCH  /api/accounts/[id]  更新
// DELETE /api/accounts/[id]  软删（removed_at_ms）
import { NextResponse } from "next/server";
import { getById, softRemove, update } from "@/lib/repo/accounts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function PATCH(
  req: Request,
  ctx: { params: { id: string } }
) {
  const acc = await getById(ctx.params.id);
  if (!acc) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const allowed: Record<string, true> = {
    display_name: true,
    sec_uid: true,
    account_type: true,
    category_id: true,
    auto_sync: true,
    track_growth: true,
    notes: true,
  };
  const patch: Record<string, unknown> = {};
  for (const k of Object.keys(body)) if (allowed[k]) patch[k] = body[k];
  await update(ctx.params.id, patch as never);
  const updated = await getById(ctx.params.id);
  return NextResponse.json({ ok: true, account: updated });
}

export async function DELETE(
  _req: Request,
  ctx: { params: { id: string } }
) {
  const acc = await getById(ctx.params.id);
  if (!acc) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  await softRemove(ctx.params.id);
  return NextResponse.json({ ok: true });
}
