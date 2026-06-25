// Client-side cache for settings data that survives component remounts
//
// 为什么需要：
// - Turso 远端 DB 有副本 stale 窗口（不同 Vercel Function 实例读到不同副本）
// - 用户切换 skill → navigate away → navigate back → 组件 remount → useEffect → refresh
//   → 拉到 stale 副本数据 → 覆盖用户刚刚设置的值（"skill 又自动开启"）
//
// 设计：
// - 模块级单例（module-level singleton），整个浏览器 tab 内全局共享
// - setSkillsTruth / setKeywordsTruth 等在每次写后调用，记录最近一次写入的值
// - getSkillsTruth / getKeywordsTruth 在 mount 时调用，返回最近一次缓存值（如果有）
// - 同时暴露 lastUpdated 时间戳，避免永久 stale 缓存
//
// 注意：
// - 这只解决"用户自己写过的状态"。新打开 tab / 强制刷新 → cache 为空 → 走 API
// - 时间戳 > 30s 的缓存视为过期，触发后台 refresh

interface CacheEntry<T> {
  value: T;
  updatedAt: number; // Date.now()
}

const SETTINGS_CACHE = {
  skills_enabled: undefined as CacheEntry<Record<string, boolean>> | undefined,
  auto_keywords: undefined as CacheEntry<string[]> | undefined,
  follower_filter: undefined as CacheEntry<{ enabled: boolean; max: number }> | undefined,
};

const MAX_AGE_MS = 30_000; // 30 秒内的缓存认为可信

function isFresh<T>(entry: CacheEntry<T> | undefined): entry is CacheEntry<T> {
  return !!entry && Date.now() - entry.updatedAt < MAX_AGE_MS;
}

// ---------- skills_enabled ----------

export function getCachedSkillsEnabled(): Record<string, boolean> | null {
  if (isFresh(SETTINGS_CACHE.skills_enabled)) {
    return SETTINGS_CACHE.skills_enabled.value;
  }
  return null;
}

export function setCachedSkillsEnabled(value: Record<string, boolean>): void {
  SETTINGS_CACHE.skills_enabled = { value, updatedAt: Date.now() };
}

// ---------- auto_keywords ----------

export function getCachedAutoKeywords(): string[] | null {
  if (isFresh(SETTINGS_CACHE.auto_keywords)) {
    return SETTINGS_CACHE.auto_keywords.value;
  }
  return null;
}

export function setCachedAutoKeywords(value: string[]): void {
  SETTINGS_CACHE.auto_keywords = { value, updatedAt: Date.now() };
}

// ---------- follower_filter ----------

export function getCachedFollowerFilter(): { enabled: boolean; max: number } | null {
  if (isFresh(SETTINGS_CACHE.follower_filter)) {
    return SETTINGS_CACHE.follower_filter.value;
  }
  return null;
}

export function setCachedFollowerFilter(value: { enabled: boolean; max: number }): void {
  SETTINGS_CACHE.follower_filter = { value, updatedAt: Date.now() };
}