// douyin-works-crawler：按抖音号/昵称查询账号 + 近期 50 条作品
// POST /story/api/dyData/queryUserWithWorks

import { redfoxFetch } from "../redfox/client";

const ENDPOINT = "/story/api/dyData/queryUserWithWorks";
const SOURCE = "抖音作品抓取-GitHub";

export interface RunArgs {
  accountName?: string;
  accountId?: string;
}

export interface AccountInfo {
  nickname: string;
  accountId: string;
  uniqueId?: string;
  uid?: string;
  secUid?: string;
  province?: string;
  city?: string;
  ipLocation?: string;
  followerCount: number;
  awemeCount: number;
  totalFavorited: number;
  redfoxIndex?: number;
}

export interface WorkListItem {
  workId: string;
  title: string;
  content?: string;
  accountName: string;
  accountId: string;
  category?: string;
  followerCount: number;
  collectCount: number;
  commentCount: number;
  shareCount: number;
  likeCount: number;
  publishTime: string;
  workUrl: string;
  url?: string;
}

export interface CrawlerResponse {
  account: AccountInfo;
  workList: WorkListItem[];
}

export async function run(args: RunArgs): Promise<CrawlerResponse | null> {
  const body: Record<string, unknown> = { source: SOURCE };
  if (args.accountName) body.accountName = args.accountName;
  if (args.accountId) body.accountId = args.accountId;
  if (!body.accountName && !body.accountId) {
    throw new Error("works-crawler requires accountName or accountId");
  }

  const data = await redfoxFetch<{
    nickname?: string;
    accountId?: string;
    uniqueId?: string;
    uid?: string;
    secUid?: string;
    province?: string;
    city?: string;
    ipLocation?: string;
    followerCount?: number;
    awemeCount?: number;
    totalFavorited?: number;
    redfoxIndex?: number;
    workList?: WorkListItem[];
  } | null>(ENDPOINT, { body });

  if (!data || !data.nickname) return null;

  return {
    account: {
      nickname: data.nickname,
      accountId: data.accountId ?? args.accountId ?? args.accountName ?? "",
      uniqueId: data.uniqueId,
      uid: data.uid,
      secUid: data.secUid,
      province: data.province,
      city: data.city,
      ipLocation: data.ipLocation,
      followerCount: data.followerCount ?? 0,
      awemeCount: data.awemeCount ?? 0,
      totalFavorited: data.totalFavorited ?? 0,
      redfoxIndex: data.redfoxIndex,
    },
    workList: data.workList ?? [],
  };
}
