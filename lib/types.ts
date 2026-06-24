// 平台标识符
export type PlatformId =
  | "douyin"
  | "xiaohongshu"
  | "weibo"
  | "bilibili"
  | "wechat"
  | "zhihu";

export interface Platform {
  id: PlatformId;
  name: string;
  // 平台品牌主色，用于徽标和左侧色条
  brandColor: string;
  // 浅色背景（用于标签）
  softBg: string;
  // 用于图标 emoji
  icon: string;
}

export interface Blogger {
  id: string;
  name: string;
  platform: PlatformId;
  followers: string; // 已格式化为 "1.2万"
}

export interface Category {
  id: string;
  name: string;
  description: string;
  enabledPlatforms: PlatformId[];
  keywords: string[];
  bloggers: Blogger[];
  createdAt: string;
}

export interface ContentMetrics {
  likes: number;
  comments: number;
  shares?: number;
  views?: number;
}

export interface ContentItem {
  id: string;
  categoryId: string;
  platform: PlatformId;
  author: string;
  // 头像首字母（用色块代替真实头像）
  avatarHue: number; // 0-360
  title: string;
  excerpt: string;
  publishTime: string; // HH:mm
  collectDate: string; // YYYY-MM-DD
  metrics: ContentMetrics;
  tags: string[];
}

export interface Topic {
  id: string;
  categoryId: string;
  reportDate: string; // YYYY-MM-DD
  title: string;
  // 选题简介
  whyDoIt: string; // 为什么要做
  viralPoint: string; // 爆点
  growthSpace: string; // 增长空间
  relatedContentCount: number;
  tags: string[];
  // 1-5 热度评分（用于排序/展示）
  heat: number;
}

export interface DailyReport {
  date: string; // YYYY-MM-DD
  categoryId: string;
  generatedAt: string; // HH:mm
  status: "ready" | "generating" | "pending";
  topics: Topic[];
  // 前一天热点摘要
  hotRecap: string[];
  // 总结的一句话洞察
  oneLiner: string;
}

// 用于 UI 派生
export interface DateBucket {
  date: string; // YYYY-MM-DD
  relativeLabel: string; // 今天 / 昨天 / 06/18
  weekday: string; // 周一
  count: number;
  hasReport: boolean;
  reportStatus?: DailyReport["status"];
  reportSummary?: string; // 一句话摘要
}