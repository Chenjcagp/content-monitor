// douyin-search：按关键词搜索抖音爆款（缓存版）
// POST /story/api/dy/search/search
// 实际响应是 flat array，不是 { articles: [...] } 包装

import { redfoxFetch } from "../redfox/client";

const ENDPOINT = "/story/api/dy/search/search";
const SOURCE = "抖音作品查询-GitHub";

export interface RunArgs {
  keyword: string;
  startDate?: string;
  endDate?: string;
}

export interface SearchArticle {
  title: string;
  accountName: string;
  author?: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  collectCount: number;
  workUrl: string;
  publishTime: string;
  followerCount: number;
}

export interface SearchResponse {
  articles: SearchArticle[];
  latestHotArticles: SearchArticle[];
  hotTopics: string[];
}

export async function run(args: RunArgs): Promise<SearchResponse> {
  const body: Record<string, unknown> = {
    keyword: args.keyword,
    source: SOURCE,
  };
  if (args.startDate) body.startDate = args.startDate;
  if (args.endDate) body.endDate = args.endDate;

  const data = await redfoxFetch<unknown>(ENDPOINT, { body });

  // 兼容两种 shape：
  // - flat array: [...]
  // - wrapped object: { articles?: [...], latestHotArticles?: [...], hotTopics?: [...] }
  if (Array.isArray(data)) {
    return {
      articles: data as SearchArticle[],
      latestHotArticles: [],
      hotTopics: [],
    };
  }
  if (data && typeof data === "object") {
    const obj = data as {
      articles?: SearchArticle[];
      latestHotArticles?: SearchArticle[];
      hotTopics?: string[];
    };
    return {
      articles: obj.articles ?? [],
      latestHotArticles: obj.latestHotArticles ?? [],
      hotTopics: Array.isArray(obj.hotTopics)
        ? (obj.hotTopics as unknown[]).map((t) =>
            typeof t === "string" ? t : (t as { name?: string }).name ?? ""
          ).filter(Boolean)
        : [],
    };
  }
  return { articles: [], latestHotArticles: [], hotTopics: [] };
}