// douyin-weekly-surge：七日点赞飙升榜
// 用 weeklyRank 数组（七日新增）

import { redfoxFetch } from "../redfox/client";

const ENDPOINT = "/story/api/dy/search/hotContentRank";
const SOURCE = "抖音七日点赞飙升榜-GitHub";

export interface RunArgs {
  type?: string;
  startTime?: string;
}

export type HotContentItem = import("./douyin-content-surge").HotContentItem;

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
  return Array.isArray(data?.weeklyRank) ? data!.weeklyRank! : [];
}
