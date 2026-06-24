"use client";

import { useMemo, useState, useEffect } from "react";
import { ContentCard } from "./ContentCard";
import { PlatformTabs } from "./PlatformTabs";
import { DateScroller } from "./DateScroller";
import { Inbox, Sparkles, Loader2 } from "lucide-react";
import type { PlatformId } from "@/lib/types";
import { buildDateBuckets } from "@/lib/aggregate";
import { getCategoryContent } from "@/lib/mockData";
import { formatNumber } from "@/lib/date";
import { useContents } from "@/lib/hooks/useContents";

export function ContentView({ categoryId }: { categoryId: string }) {
  const buckets = useMemo(() => buildDateBuckets(categoryId, 14), [categoryId]);
  const [selectedDate, setSelectedDate] = useState(buckets[0]?.date ?? "");
  const [platform, setPlatform] = useState<PlatformId | "all">("all");

  // 真实数据（fetch /api/contents）
  const { items: dbItems, loading, error } = useContents({
    categoryId,
    platform,
    date: selectedDate,
    limit: 24,
  });

  // mock 兜底：仅当 DB 返回空且非 loading 时才用
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const useMockFallback =
    !loading && (dbItems.length === 0 || error !== null);

  const mockItems = useMemo(
    () =>
      useMockFallback
        ? getCategoryContent(categoryId, platform, selectedDate).slice(0, 24)
        : [],
    [useMockFallback, categoryId, platform, selectedDate]
  );

  const items = useMockFallback ? mockItems : dbItems;

  // 平台计数：DB 模式用 fetched 数据简单分桶；mock 模式走 mockData
  const counts = useMemo(() => {
    if (!useMockFallback) {
      const out: Record<string, number> = { all: dbItems.length };
      for (const it of dbItems) {
        out[it.platform] = (out[it.platform] ?? 0) + 1;
      }
      // 兜底零值（PLATFORM_LIST 在每个 id 上都有 key）
      const fallback = { xiaohongshu: 0, weibo: 0, bilibili: 0, wechat: 0, zhihu: 0 };
      return { ...fallback, ...out } as Record<string, number>;
    }
    const { platformCounts } = require("@/lib/aggregate");
    return platformCounts(categoryId, selectedDate);
  }, [useMockFallback, dbItems, categoryId, selectedDate]);

  const totalLikes = items.reduce((s, c) => s + c.metrics.likes, 0);

  return (
    <div className="p-6 space-y-5">
      {/* 平台筛选 */}
      <section>
        <SectionTitle icon={<Sparkles className="h-3.5 w-3.5" />}>
          按平台筛选
        </SectionTitle>
        <PlatformTabs
          active={platform}
          onChange={setPlatform}
          counts={counts}
        />
      </section>

      {/* 时间线选择 */}
      <section>
        <SectionTitle>按日期浏览</SectionTitle>
        <DateScroller
          buckets={buckets}
          selected={selectedDate}
          onChange={setSelectedDate}
        />
      </section>

      {/* 摘要 */}
      <div className="flex items-center justify-between rounded-lg bg-slate-50 px-4 py-2.5 text-xs text-slate-600">
        <div>
          {loading ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              正在加载数据…
            </span>
          ) : (
            <>
              共 <strong className="text-slate-900 tabular-nums">{items.length}</strong> 条内容 · 总互动量{" "}
              <strong className="text-slate-900 tabular-nums">{formatNumber(totalLikes)}</strong>
              {useMockFallback && (
                <span className="ml-2 text-[10.5px] text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
                  暂无真实数据，使用示例数据
                </span>
              )}
            </>
          )}
        </div>
        <div className="text-slate-400">
          排序：按热度降序
        </div>
      </div>

      {/* 内容列表 */}
      {!mounted || loading ? null : items.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {items.map((c) => (
            <ContentCard key={c.id} item={c} />
          ))}
        </div>
      )}
    </div>
  );
}

function SectionTitle({
  icon,
  children,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-1.5 mb-2.5 text-[11px] font-semibold tracking-wide text-slate-400 uppercase">
      {icon}
      {children}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Inbox className="h-10 w-10 mb-3" />
      <div className="text-sm">所选条件下暂无内容</div>
      <div className="text-xs mt-1">试试切换平台或选择其他日期</div>
    </div>
  );
}