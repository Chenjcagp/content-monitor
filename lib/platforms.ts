import type { Platform, PlatformId } from "./types";

export const PLATFORMS: Record<PlatformId, Platform> = {
  douyin: {
    id: "douyin",
    name: "抖音",
    brandColor: "#000000",
    softBg: "#fef2f2",
    icon: "🎵",
  },
  xiaohongshu: {
    id: "xiaohongshu",
    name: "小红书",
    brandColor: "#ff2442",
    softBg: "#fff1f3",
    icon: "📕",
  },
  weibo: {
    id: "weibo",
    name: "微博",
    brandColor: "#e6162d",
    softBg: "#fef3f4",
    icon: "📲",
  },
  bilibili: {
    id: "bilibili",
    name: "B站",
    brandColor: "#00aeec",
    softBg: "#ecf9ff",
    icon: "📺",
  },
  wechat: {
    id: "wechat",
    name: "公众号",
    brandColor: "#07c160",
    softBg: "#ecf9f1",
    icon: "💬",
  },
  zhihu: {
    id: "zhihu",
    name: "知乎",
    brandColor: "#0084ff",
    softBg: "#eaf4ff",
    icon: "💡",
  },
};

export const PLATFORM_LIST: Platform[] = Object.values(PLATFORMS);