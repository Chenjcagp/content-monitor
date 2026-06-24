-- 数据采集助手 · SQLite schema
-- 5 张表 + 索引
-- 通过 lib/db.ts 在首次启动时执行
-- PRAGMA 在 db.ts 里按环境决定（WAL 仅本地；foreign_keys 始终开启）

-- 1. 采集到的内容（3 榜单 + 1 搜索 + 1 订阅 共用）
CREATE TABLE IF NOT EXISTS contents (
  id TEXT NOT NULL,
  source_skill TEXT NOT NULL,
  source_keyword TEXT,                  -- 仅 douyin-search 有值
  category_id TEXT,
  platform TEXT NOT NULL,
  author TEXT,
  author_id TEXT,
  author_followers INTEGER,             -- 用于粉丝数过滤
  title TEXT NOT NULL,
  excerpt TEXT,
  url TEXT,
  publish_time_ms INTEGER,
  collect_date TEXT NOT NULL,           -- 'YYYY-MM-DD' 冗余便于按日聚合
  metrics_json TEXT NOT NULL,           -- JSON: {likeCount, commentCount, shareCount, collectCount}
  tags_json TEXT NOT NULL DEFAULT '[]', -- JSON 数组
  created_at_ms INTEGER NOT NULL,
  PRIMARY KEY (source_skill, id, collect_date)
);
CREATE INDEX IF NOT EXISTS idx_contents_lookup
  ON contents (platform, source_skill, collect_date);
CREATE INDEX IF NOT EXISTS idx_contents_keyword
  ON contents (source_skill, source_keyword, collect_date);
CREATE INDEX IF NOT EXISTS idx_contents_publish
  ON contents (publish_time_ms);

-- 2. 关注的账号（对标监控）
CREATE TABLE IF NOT EXISTS tracked_accounts (
  id TEXT PRIMARY KEY,
  douyin_id TEXT NOT NULL UNIQUE,
  display_name TEXT,
  sec_uid TEXT,
  account_type TEXT NOT NULL,           -- 'compete' | 'similar' | 'follow'
  category_id TEXT,
  follower_count INTEGER,
  total_favorited INTEGER,
  aweme_count INTEGER,
  redfox_index REAL,
  auto_sync INTEGER NOT NULL DEFAULT 1,
  track_growth INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  added_at_ms INTEGER NOT NULL,
  last_fetched_at_ms INTEGER,
  removed_at_ms INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tracked_accounts_active
  ON tracked_accounts (removed_at_ms, account_type);

-- 3. 账号每日快照（用于 sparkline）
CREATE TABLE IF NOT EXISTS tracked_account_snapshots (
  account_id TEXT NOT NULL,
  snapshot_date TEXT NOT NULL,          -- 'YYYY-MM-DD'
  follower_count INTEGER,
  total_favorited INTEGER,
  aweme_count INTEGER,
  redfox_index REAL,
  metrics_json TEXT,
  PRIMARY KEY (account_id, snapshot_date)
);

-- 4. 全局设置（key-value JSON）
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at_ms INTEGER NOT NULL
);

-- 5. 同步日志
CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at_ms INTEGER NOT NULL,
  finished_at_ms INTEGER,
  skills_json TEXT,
  items_inserted INTEGER,
  status TEXT,                          -- 'ok' | 'partial' | 'failed'
  error TEXT
);
CREATE INDEX IF NOT EXISTS idx_sync_log_started
  ON sync_log (started_at_ms DESC);

-- 6. 监控分类（持久化 — 替代原 mockData 内存中的 CATEGORIES）
CREATE TABLE IF NOT EXISTS monitor_categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  enabled_platforms_json TEXT NOT NULL DEFAULT '[]',  -- ["douyin","xiaohongshu",...]
  keywords_json TEXT NOT NULL DEFAULT '[]',          -- 分类自己的关键词（与全局 auto_keywords 独立）
  enabled INTEGER NOT NULL DEFAULT 1,                 -- 0 = 暂停采集；cron/立即运行会跳过
  created_at_ms INTEGER NOT NULL,
  removed_at_ms INTEGER                               -- NULL = active
);
CREATE INDEX IF NOT EXISTS idx_monitor_categories_active
  ON monitor_categories (removed_at_ms);
CREATE INDEX IF NOT EXISTS idx_monitor_categories_enabled
  ON monitor_categories (enabled);
