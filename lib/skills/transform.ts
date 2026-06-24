// 5 种 raw shape → InsertContentInput 归一化
// douyin-search 不应用关键词过滤 / 28 赛道过滤（user requirement #5）
// realtime-search 不入库（只用于返回前端）

import type { InsertContentInput } from "../repo/contents";
import type { HotContentItem } from "./douyin-content-surge";
import type { DailyHotItem } from "./douyin-daily-hot";
import type { SearchArticle, SearchResponse } from "./douyin-search";
import type { SubscribeWork } from "./douyin-subscribe";
import type { CrawlerResponse, WorkListItem } from "./douyin-works-crawler";

const PLATFORM = "douyin";

/** "YYYY-MM-DD HH:mm:ss" → ms timestamp；解析失败返回 null */
function parsePublishMs(s: string | undefined | null): number | null {
  if (!s) return null;
  // redfox 返回 "YYYY-MM-DD HH:mm:ss" 或 "YYYY-MM-DDTHH:mm:ss"
  const norm = s.includes("T") ? s : s.replace(" ", "T");
  const t = Date.parse(norm);
  return Number.isFinite(t) ? t : null;
}

/** 粉丝数过滤：未知(0) 直接放行；已知则要求 ≤ max */
export function passesFollowerFilter(
  followers: number | null | undefined,
  max: number
): boolean {
  if (followers == null || followers === 0) return true;
  return followers <= max;
}

/** ===== Leaderboards: content-surge / weekly-surge ===== */
function fromLeaderboard(
  skillId: string,
  items: HotContentItem[],
  categoryId: string | null,
  collectDate: string
): InsertContentInput[] {
  return items
    .filter((i) => i.aweme_id)
    .map<InsertContentInput>((i) => ({
      id: String(i.aweme_id),
      source_skill: skillId,
      source_keyword: null,
      category_id: categoryId,
      platform: PLATFORM,
      author: i.accountName ?? null,
      author_id: i.author_user_id ?? null,
      author_followers: null,           // leaderboards 不返回 followerCount
      title: (i.aweme_desc ?? "").slice(0, 200),
      excerpt: i.aweme_desc ?? null,
      url: i.work_url ?? i.share_url ?? "",
      publish_time_ms: parsePublishMs(
        i.ana_time ? new Date(i.ana_time).toISOString().slice(0, 19).replace("T", " ") : null
      ),
      collect_date: collectDate,
      metrics: {
        likeCount: i.add_digg_count ?? 0,
        commentCount: i.add_comment_count ?? 0,
        shareCount: i.add_share_count ?? 0,
        collectCount: i.add_collect_count ?? 0,
      },
      tags: i.category ? [i.category] : [],
    }));
}

/** ===== daily-hot: 字段名不同 ===== */
function fromDailyHot(
  items: DailyHotItem[],
  categoryId: string | null,
  collectDate: string
): InsertContentInput[] {
  return items
    .filter((i) => i.workId)
    .map<InsertContentInput>((i) => ({
      id: String(i.workId),
      source_skill: "douyin-daily-hot",
      source_keyword: null,
      category_id: categoryId,
      platform: PLATFORM,
      author: i.accountName ?? null,
      author_id: i.accountId ?? null,
      author_followers: i.followerCount ?? null,
      title: (i.title ?? i.content ?? "").slice(0, 200),
      excerpt: i.content ?? null,
      url: i.workUrl ?? "",
      publish_time_ms: parsePublishMs(i.publishTime),
      collect_date: collectDate,
      metrics: {
        likeCount: i.likeCount ?? 0,
        commentCount: i.commentCount ?? 0,
        shareCount: i.shareCount ?? 0,
        collectCount: i.collectCount ?? 0,
      },
      tags: i.category ? [i.category] : [],
    }));
}

/** ===== douyin-search: 关键词搜索缓存版（不过滤 settings） ===== */
function fromSearch(
  resp: SearchResponse,
  keyword: string,
  collectDate: string
): InsertContentInput[] {
  const items = resp.articles ?? [];
  return items.map<InsertContentInput>((a, idx) => ({
    id: `${keyword}:${idx}:${a.workUrl ?? a.title?.slice(0, 30)}`,
    source_skill: "douyin-search",
    source_keyword: keyword,
    category_id: null,         // 搜索结果不绑死 category
    platform: PLATFORM,
    author: a.accountName ?? a.author ?? null,
    author_id: null,
    author_followers: a.followerCount ?? null,
    title: (a.title ?? "").slice(0, 200),
    excerpt: null,
    url: a.workUrl ?? "",
    publish_time_ms: parsePublishMs(a.publishTime),
    collect_date: collectDate,
    metrics: {
      likeCount: a.likeCount ?? 0,
      commentCount: a.commentCount ?? 0,
      shareCount: a.shareCount ?? 0,
      collectCount: a.collectCount ?? 0,
    },
    tags: [],
  }));
}

/** ===== works-crawler / subscribe ===== */
function fromCrawlerWorkList(
  skillId: string,
  items: WorkListItem[] | SubscribeWork[],
  accountId: string,
  accountName: string,
  collectDate: string
): InsertContentInput[] {
  return items
    .filter((i): i is WorkListItem => Boolean(i.workId))
    .map<InsertContentInput>((i) => ({
      id: String(i.workId),
      source_skill: skillId,
      source_keyword: null,
      category_id: null,
      platform: PLATFORM,
      author: i.accountName ?? accountName,
      author_id: i.accountId ?? accountId,
      author_followers: i.followerCount ?? null,
      title: (i.title ?? i.content ?? "").slice(0, 200),
      excerpt: i.content ?? null,
      url: i.workUrl ?? i.url ?? "",
      publish_time_ms: parsePublishMs(i.publishTime),
      collect_date: collectDate,
      metrics: {
        likeCount: i.likeCount ?? 0,
        commentCount: i.commentCount ?? 0,
        shareCount: i.shareCount ?? 0,
        collectCount: i.collectCount ?? 0,
      },
      tags: i.category ? [i.category] : [],
    }));
}

/** ===== Public API ===== */

export function transformLeaderboard(
  skillId: "douyin-content-surge" | "douyin-weekly-surge",
  raw: HotContentItem[],
  collectDate: string,
  categoryId: string | null = null
): InsertContentInput[] {
  return fromLeaderboard(skillId, raw, categoryId, collectDate);
}

export function transformDailyHot(
  raw: DailyHotItem[],
  collectDate: string,
  categoryId: string | null = null
): InsertContentInput[] {
  return fromDailyHot(raw, categoryId, collectDate);
}

export function transformSearch(
  resp: SearchResponse,
  keyword: string,
  collectDate: string
): InsertContentInput[] {
  return fromSearch(resp, keyword, collectDate);
}

export function transformCrawler(
  resp: CrawlerResponse,
  collectDate: string
): InsertContentInput[] {
  if (!resp?.account) return [];
  return fromCrawlerWorkList(
    "douyin-works-crawler",
    resp.workList ?? [],
    resp.account.accountId,
    resp.account.nickname,
    collectDate
  );
}

export function transformSubscribe(
  items: SubscribeWork[],
  accountId: string,
  accountName: string,
  collectDate: string
): InsertContentInput[] {
  return fromCrawlerWorkList("douyin-subscribe", items, accountId, accountName, collectDate);
}

/** 工具：取得当前 YYYY-MM-DD（Asia/Shanghai TZ） */
export function todayYMD(): string {
  const now = new Date();
  // 用 toLocaleString 强制 Asia/Shanghai
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(now); // "YYYY-MM-DD"
}