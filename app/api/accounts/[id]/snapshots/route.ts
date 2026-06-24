// GET /api/accounts/[id]/snapshots?days=30  返回账号的成长曲线
import { NextResponse } from "next/server";
import { getById } from "@/lib/repo/accounts";
import { listForAccount } from "@/lib/repo/snapshots";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: { id: string } }
) {
  const acc = await getById(ctx.params.id);
  if (!acc) return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  const url = new URL(req.url);
  const days = Math.min(365, Math.max(1, Number(url.searchParams.get("days")) || 30));
  const snaps = await listForAccount(ctx.params.id, days);
  return NextResponse.json({ ok: true, account: acc, snapshots: snaps });
}
