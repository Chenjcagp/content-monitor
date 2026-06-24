// douyin-daily-hot：每日热门作品榜
// 实际响应直接是 flat array，字段名与 leaderboard 不同：
// workId / title / accountId / accountName / likeCount / followerCount
// 注意此 skill 返回的 workId 是字符串（"7654050002402132706"）

import { redfoxFetch } from "../redfox/client";

const ENDPOINT = "/story/api/dy/search/likesRank";
const SOURCE = "抖音每日热门作品榜-GitHub";

export interface RunArgs {
  type?: string;
  startTime?: string;
  endTime?: string;
}

export interface DailyHotItem {
  accountId: string;
  accountName: string;
  avatarUrl?: string;
  category: string | null;
  chaInfoTitle?: string | null;
  collectCount: number;
  commentCount: number;
  content?: string;
  coverUrl?: string;
  duration?: number;
  followerCount: number;
  isPromotion?: string | null;
  likeCount: number;
  popularityScore?: string | null;
  publishTime: string;        // "YYYY-MM-DD HH:mm:ss"
  recencyScore?: string | null;
  relevanceScore?: string | null;
  repostCount: number;
  shareCount: number;
  title: string;
  workId: string;
  workType?: string;
  workUrl?: string;
}

export async function run(args: RunArgs = {}): Promise<DailyHotItem[]> {
  const data = await redfoxFetch<DailyHotItem[]>(ENDPOINT, {
    body: {
      type: args.type ?? "全部",
      startTime: args.startTime ?? "",
      endTime: args.endTime ?? args.startTime ?? "",
      source: SOURCE,
    },
  });
  return Array.isArray(data) ? data : [];
}