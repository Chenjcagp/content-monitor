// 聚合统计与 UI 派生数据

import type { ContentItem, DateBucket, PlatformId } from "./types";
import { PLATFORM_LIST } from "./platforms";
import { TODAY, addDays, formatYMD, getRelativeLabel, getShortDate, getWeekday } from "./date";
import { CONTENT_BY_CATEGORY, REPORTS_BY_CATEGORY } from "./mockData";

// 某个分类在某天的各平台数量 + 总数
export function platformCountByDate(
  categoryId: string,
  date: string
): Record<PlatformId | "all", number> {
  const items = CONTENT_BY_CATEGORY[categoryId] ?? [];
  const inDay = items.filter((c) => c.collectDate === date);
  const out: Record<string, number> = { all: inDay.length };
  PLATFORM_LIST.forEach((p) => {
    out[p.id] = inDay.filter((c) => c.platform === p.id).length;
  });
  return out as Record<PlatformId | "all", number>;
}

// 某分类每个日期的总条数（用于日期卡片徽章）
export function countByDate(categoryId: string): Record<string, number> {
  const items = CONTENT_BY_CATEGORY[categoryId] ?? [];
  const out: Record<string, number> = {};
  items.forEach((c) => {
    out[c.collectDate] = (out[c.collectDate] ?? 0) + 1;
  });
  return out;
}

// 生成时间选择器的数据源：最近 14 天
export function buildDateBuckets(categoryId: string, days = 14): DateBucket[] {
  const counts = countByDate(categoryId);
  const reports = REPORTS_BY_CATEGORY[categoryId] ?? [];
  const buckets: DateBucket[] = [];
  for (let i = 0; i < days; i++) {
    const d = addDays(TODAY, -i);
    const date = formatYMD(d);
    const r = reports.find((x) => x.date === date);
    const topics = r?.topics ?? [];
    buckets.push({
      date,
      relativeLabel: getRelativeLabel(d),
      weekday: getWeekday(d),
      count: counts[date] ?? 0,
      hasReport: !!r && r.status === "ready" && topics.length > 0,
      reportStatus: r?.status ?? "pending",
      reportSummary: r?.oneLiner,
    });
  }
  return buckets;
}

// 平台徽章数量
export function platformCounts(
  categoryId: string,
  date?: string
): Record<PlatformId | "all", number> {
  const items = CONTENT_BY_CATEGORY[categoryId] ?? [];
  const filtered = date ? items.filter((c) => c.collectDate === date) : items;
  const out: Record<string, number> = { all: filtered.length };
  PLATFORM_LIST.forEach((p) => {
    out[p.id] = filtered.filter((c) => c.platform === p.id).length;
  });
  return out as Record<PlatformId | "all", number>;
}

// 平台下的前 N 条（用于顶部摘要）
export function topByPlatform(
  items: ContentItem[],
  platform: PlatformId | "all",
  n: number
): ContentItem[] {
  const filtered =
    platform === "all" ? items : items.filter((c) => c.platform === platform);
  return filtered.slice(0, n);
}