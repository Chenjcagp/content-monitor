// douyin-realtime-search：实时搜索抖音作品（不入库）
// POST /story/api/dy/search/openSearch

import { redfoxFetch } from "../redfox/client";

const ENDPOINT = "/story/api/dy/search/openSearch";
const SOURCE = "抖音作品实时搜索-GitHub";

export type SortType = "1" | "2" | "3";
export type TimeWindow = "7" | "30" | "90" | "0";

export interface RunArgs {
  keyword: string;
  sortType?: SortType;
  publishTime?: TimeWindow;
  offset?: number;
}

export interface RealtimeArticle {
  /** 作品 ID，real 字段叫 opusId */
  opusId?: string;
  /** 部分响应也可能用 awemeId */
  awemeId?: string;
  description: string;
  nickname: string;
  likeNum: number;
  commentNum: number;
  shareNum: number;
  collectNum: number;
  forwardNum?: number;
  playNum?: number;
  url: string;
  publishTime: string;
  fansNum: number;
  topics?: string;
}

export interface RealtimeResponse {
  list: RealtimeArticle[];
  latestHotArticles?: RealtimeArticle[];
  hotTopics?: Array<{ name: string; value?: number }> | string[];
  cursor?: string;
  hasMore?: number;
}

export async function run(args: RunArgs): Promise<RealtimeResponse> {
  const data = await redfoxFetch<RealtimeResponse>(ENDPOINT, {
    body: {
      keyword: args.keyword,
      sortType: args.sortType ?? "1",
      publishTime: args.publishTime ?? "7",
      offset: args.offset ?? 0,
      source: SOURCE,
    },
  });
  return data ?? { list: [], latestHotArticles: [], hotTopics: [] };
}
