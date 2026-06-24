// douyin-subscribe：按账号 ID + 日期范围查作品
// POST /story/api/dyData/searchWorkList
// 实际响应: { hasMore: number, list: SubscribeWork[] }
// 字段名：authorId（不是 accountId）, workUrl, likeCount（驼峰）

import { redfoxFetch } from "../redfox/client";

const ENDPOINT = "/story/api/dyData/searchWorkList";
const SOURCE = "抖音账号订阅-GitHub";

export interface RunArgs {
  accountId: string;
  accountName?: string;
  publishTimeStart?: string;
  publishTimeEnd?: string;
  offset?: number;
}

export interface SubscribeWork {
  workId: string;
  title: string;
  content?: string;
  accountName: string;
  authorId: string;
  avatarUrl?: string;
  coverUrl?: string;
  duration?: number;
  followerCount: number;
  secUid?: string;
  collectCount: number;
  commentCount: number;
  shareCount: number;
  repostCount: number;
  likeCount: number;
  publishTime: string;          // "YYYY-MM-DD HH:mm:ss"
  crawlTime?: string;
  workType?: string;
  workUrl: string;
  isPromotion?: string | null;
}

export interface SubscribeResponse {
  list: SubscribeWork[];
  hasMore: number;
}

export async function run(args: RunArgs): Promise<SubscribeWork[]> {
  const body: Record<string, unknown> = {
    authorId: args.accountId,           // real field is authorId
    accountName: args.accountName ?? "",
    offset: args.offset ?? 0,
    sortType: "_2",
    source: SOURCE,
  };
  if (args.publishTimeStart) body.publishTimeStart = `${args.publishTimeStart} 00:00:00`;
  if (args.publishTimeEnd) body.publishTimeEnd = `${args.publishTimeEnd} 23:59:59`;

  const data = await redfoxFetch<SubscribeResponse | null>(ENDPOINT, { body });
  return data?.list ?? [];
}