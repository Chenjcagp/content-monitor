// GET  /api/accounts       列出所有 active 账号
// POST /api/accounts       新增 { douyin_id, account_type, display_name?, notes?, auto_sync?, track_growth?, category_id? }
import { NextResponse } from "next/server";
import { add, listActive, getByDouyinId, updateFromCrawler } from "@/lib/repo/accounts";
import { run as worksCrawler } from "@/lib/skills/douyin-works-crawler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const accounts = await listActive();
  return NextResponse.json({ ok: true, accounts });
}

export async function POST(req: Request) {
  let body: {
    douyin_id?: string;
    account_type?: string;
    display_name?: string;
    notes?: string;
    auto_sync?: boolean;
    track_growth?: boolean;
    category_id?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
  }
  const douyinId = String(body.douyin_id ?? "").trim();
  const accountType = String(body.account_type ?? "").trim();
  if (!douyinId) {
    return NextResponse.json({ ok: false, error: "douyin_id is required" }, { status: 400 });
  }
  if (!["compete", "similar", "follow"].includes(accountType)) {
    return NextResponse.json(
      { ok: false, error: "account_type must be compete|similar|follow" },
      { status: 400 }
    );
  }
  if (await getByDouyinId(douyinId)) {
    return NextResponse.json(
      { ok: false, error: "already tracked" },
      { status: 409 }
    );
  }

  const acc = await add({
    douyin_id: douyinId,
    account_type: accountType as "compete" | "similar" | "follow",
    display_name: body.display_name ?? null,
    notes: body.notes ?? null,
    auto_sync: body.auto_sync !== false,
    track_growth: body.track_growth !== false,
    category_id: body.category_id ?? null,
  });

  // 同步用 works-crawler 回填元数据（Vercel 上必须 await，
  // 否则 Function 在 response 返回后立即冻结，fire-and-forget 会丢）
  try {
    const resp = await worksCrawler({ accountId: douyinId, accountName: body.display_name });
    if (resp?.account) {
      await updateFromCrawler(douyinId, {
        display_name: resp.account.nickname,
        sec_uid: resp.account.secUid,
        follower_count: resp.account.followerCount,
        total_favorited: resp.account.totalFavorited,
        aweme_count: resp.account.awemeCount,
        redfox_index: resp.account.redfoxIndex,
      });
    }
  } catch (e) {
    console.error("[accounts] crawler fetch failed:", e);
  }

  return NextResponse.json({ ok: true, account: acc });
}
