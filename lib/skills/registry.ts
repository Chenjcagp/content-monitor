// 7 个 skill 的注册表（纯数据，无依赖）

export type SkillId =
  | "douyin-content-surge"
  | "douyin-weekly-surge"
  | "douyin-daily-hot"
  | "douyin-search"
  | "douyin-realtime-search"
  | "douyin-works-crawler"
  | "douyin-subscribe";

export type SkillCategory = "leaderboard" | "search" | "account";

export interface SkillDef {
  id: SkillId;
  name: string;
  category: SkillCategory;
  source: string;
  endpoint: string;
  description: string;
  persist: boolean;
  defaultEnabled: boolean;
}

export const SKILLS: SkillDef[] = [
  {
    id: "douyin-content-surge",
    name: "每日飙升",
    category: "leaderboard",
    source: "抖音每日点赞飙升榜-GitHub",
    endpoint: "/story/api/dy/search/hotContentRank",
    description: "日度新增点赞 TOP50 榜单，每日 17:00 更新昨日数据",
    persist: true,
    defaultEnabled: true,
  },
  {
    id: "douyin-weekly-surge",
    name: "七日飙升",
    category: "leaderboard",
    source: "抖音七日点赞飙升榜-GitHub",
    endpoint: "/story/api/dy/search/hotContentRank",
    description: "七日新增点赞 TOP50 榜单，每日 17:00 更新过去 7 日数据",
    persist: true,
    defaultEnabled: true,
  },
  {
    id: "douyin-daily-hot",
    name: "每日热门",
    category: "leaderboard",
    source: "抖音每日热门作品榜-GitHub",
    endpoint: "/story/api/dy/search/likesRank",
    description: "单日点赞累计 TOP50 榜单，每日 06:00 更新昨日数据",
    persist: true,
    defaultEnabled: true,
  },
  {
    id: "douyin-search",
    name: "关键词搜索（缓存版）",
    category: "search",
    source: "抖音作品查询-GitHub",
    endpoint: "/story/api/dy/search/search",
    description: "按关键词搜索抖音爆款，支持日期范围（自动拓词）",
    persist: true,
    defaultEnabled: true,
  },
  {
    id: "douyin-realtime-search",
    name: "关键词搜索（实时版）",
    category: "search",
    source: "抖音作品实时搜索-GitHub",
    endpoint: "/story/api/dy/search/openSearch",
    description: "实时搜索抖音作品（不入库），支持分页+排序",
    persist: false,
    defaultEnabled: true,
  },
  {
    id: "douyin-works-crawler",
    name: "作品爬取",
    category: "account",
    source: "抖音作品抓取-GitHub",
    endpoint: "/story/api/dyData/queryUserWithWorks",
    description: "按抖音号查询账号基础信息 + 近期 50 条作品",
    persist: true,
    defaultEnabled: true,
  },
  {
    id: "douyin-subscribe",
    name: "账号订阅",
    category: "account",
    source: "抖音账号订阅-GitHub",
    endpoint: "/story/api/dyData/searchWorkList",
    description: "按抖音号 + 日期范围查询指定账号的作品",
    persist: true,
    defaultEnabled: true,
  },
];

export function getSkill(id: string): SkillDef | undefined {
  return SKILLS.find((s) => s.id === id);
}
