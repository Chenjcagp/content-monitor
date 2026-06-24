// douyin-content-surge：每日点赞飙升榜
// 实际响应是 { dailyRank: [...], weeklyRank: [...] } 对象
// 我们用 dailyRank（单日新增点赞）

import { redfoxFetch } from "../redfox/client";

const ENDPOINT = "/story/api/dy/search/hotContentRank";
const SOURCE = "抖音每日点赞飙升榜-GitHub";

export interface RunArgs {
  type?: string;
  startTime?: string;
}

/** 真实响应里的单条作品 */
export interface HotContentItem {
  aweme_id: string;
  aweme_desc: string;
  cover_url: string;
  category: string;
  author_user_id: string;
  /** 账号名需要另外查 - 这个 API 不返回 nickname */
  accountName?: string;
  add_digg_count: number;
  add_collect_count: number;
  add_comment_count: number;
  add_share_count: number;
  add_forward_count: number | null;
  ana_time: number;        // ms timestamp
  share_url?: string;
  work_url?: string;
}

interface RawResp {
  dailyRank?: HotContentItem[];
  weeklyRank?: HotContentItem[];
}

export async function run(args: RunArgs = {}): Promise<HotContentItem[]> {
  const data = await redfoxFetch<RawResp>(ENDPOINT, {
    body: {
      type: args.type ?? "全部",
      startTime: args.startTime ?? "",
      source: SOURCE,
    },
  });
  return Array.isArray(data?.dailyRank) ? data!.dailyRank! : [];
}
