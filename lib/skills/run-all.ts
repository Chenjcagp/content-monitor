// 编排层：cron / 立即同步 / 回填 都走这里
// 流程：enabled 过滤 → 取 settings → 串行调用每个 skill → follower 过滤 → 批量插入 → 记录 sync_log

import { SKILLS, SKILL_RUNNERS, type SkillId } from "./types";
import {
  transformLeaderboard,
  transformDailyHot,
  transformSearch,
  transformCrawler,
  transformSubscribe,
  passesFollowerFilter,
  todayYMD,
} from "./transform";
import { insertMany, latestCollectDate } from "../repo/contents";
import {
  getAutoKeywords,
  getFollowerFilter,
  getSkillsEnabled,
} from "../repo/settings";
import {
  startRun,
  finishRun,
  type SyncStatus,
} from "../repo/sync-log";
import { listActive as listActiveAccounts } from "../repo/accounts";
import { listActive as listActiveCategories } from "../repo/categories";
import { upsert as upsertSnapshot } from "../repo/snapshots";

export interface RunAllOptions {
  /** 跳过 enabled 过滤（cron 强制按 settings；手动触发可选 all） */
  forceAll?: boolean;
  /** 指定 skill（默认所有 enabled） */
  skillIds?: SkillId[];
  /** 回填：从 startDate 到今天，按天跑（仅 leaderboard） */
  backfillDays?: number;
  /** 自定义 collectDate（默认今天） */
  collectDate?: string;
}

export interface SkillRunResult {
  skillId: SkillId;
  status: "ok" | "skipped" | "failed";
  fetched: number;
  inserted: number;
  error?: string;
}

export interface RunAllResult {
  runId: number;
  collectDate: string;
  skills: SkillRunResult[];
  totalInserted: number;
  status: SyncStatus;
  error?: string;
}

function pickSkills(opts: RunAllOptions, enabled: Record<string, boolean>): SkillId[] {
  if (opts.skillIds?.length) return opts.skillIds;
  return SKILLS.filter(
    (s) => opts.forceAll || enabled[s.id] !== false
  ).map((s) => s.id);
}

export async function runAll(opts: RunAllOptions = {}): Promise<RunAllResult> {
  const collectDate = opts.collectDate ?? todayYMD();
  const enabled = await getSkillsEnabled();
  const skillIds = pickSkills(opts, enabled);
  const runId = await startRun(skillIds);
  const result: SkillRunResult[] = [];
  let totalInserted = 0;
  const ff = await getFollowerFilter();

  try {
    for (const sid of skillIds) {
      try {
        const r = await runOne(sid, collectDate, ff, opts);
        result.push(r);
        totalInserted += r.inserted;
      } catch (e) {
        result.push({
          skillId: sid,
          status: "failed",
          fetched: 0,
          inserted: 0,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }
    const anyFailed = result.some((r) => r.status === "failed");
    const anyOk = result.some((r) => r.status === "ok");
    const status: SyncStatus = anyFailed && anyOk ? "partial" : anyFailed ? "failed" : "ok";
    await finishRun(runId, status, totalInserted);
    return { runId, collectDate, skills: result, totalInserted, status };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await finishRun(runId, "failed", totalInserted, msg);
    return {
      runId,
      collectDate,
      skills: result,
      totalInserted,
      status: "failed",
      error: msg,
    };
  }
}

/** 单个 skill：采集 + 入库 + 账号快照 */
async function runOne(
  sid: SkillId,
  collectDate: string,
  ff: { enabled: boolean; max: number },
  opts: RunAllOptions
): Promise<SkillRunResult> {
  // realtime-search 不入库也不跑（用户手动触发时直接走 API，不走这里）
  if (sid === "douyin-realtime-search") {
    return { skillId: sid, status: "skipped", fetched: 0, inserted: 0 };
  }

  // douyin-search 一次只跑一次（拿 settings 里的全部关键词）
  // douyin-content-surge / weekly-surge / daily-hot 走 leaderboard
  // works-crawler / subscribe 走账号列表

  const runner = SKILL_RUNNERS[sid];
  let raw: unknown;
  let inputs: ReturnType<typeof transformLeaderboard> = [];

  switch (sid) {
    case "douyin-content-surge":
    case "douyin-weekly-surge": {
      raw = await runner({});
      const items = Array.isArray(raw) ? (raw as never[]) : [];
      // 回填模式：按 ana_time 重新分配 collect_date
      inputs = transformLeaderboard(sid, items as never, collectDate, null);
      break;
    }
    case "douyin-daily-hot": {
      raw = await runner({});
      const items = Array.isArray(raw) ? (raw as never[]) : [];
      inputs = transformDailyHot(items as never, collectDate, null);
      break;
    }
    case "douyin-search": {
      // keywords = 全局 auto_keywords + 所有 enabled 分类的 keywords（去重）
      // 禁用一个分类 = 该分类的 keywords 不参与本次搜索
      const globalKw = await getAutoKeywords();
      const enabledCats = (await listActiveCategories()).filter((c) => c.enabled === 1);
      const catKw = enabledCats.flatMap((c) => c.keywords);
      const keywords = Array.from(new Set([...globalKw, ...catKw])).filter(Boolean);
      if (!keywords.length) {
        return { skillId: sid, status: "skipped", fetched: 0, inserted: 0 };
      }
      // 关键词搜索不过滤 settings（user requirement #5）
      const all: typeof inputs = [];
      for (const kw of keywords) {
        try {
          const r = (await runner({ keyword: kw })) as { articles?: unknown[] };
          const articles = (r?.articles ?? []) as never[];
          all.push(...transformSearch(r as never, kw, collectDate));
        } catch {
          // 单个关键词失败不中断整体
        }
      }
      inputs = all;
      break;
    }
    case "douyin-works-crawler": {
      const accounts = (await listActiveAccounts()).filter((a) => a.auto_sync === 1);
      if (!accounts.length) {
        return { skillId: sid, status: "skipped", fetched: 0, inserted: 0 };
      }
      const all: typeof inputs = [];
      for (const acc of accounts) {
        try {
          const resp = (await runner({ accountId: acc.douyin_id })) as {
            account?: {
              accountId: string;
              nickname: string;
              followerCount?: number;
              totalFavorited?: number;
              awemeCount?: number;
              redfoxIndex?: number;
              secUid?: string;
            };
            workList?: unknown[];
          } | null;
          if (!resp?.account) continue;
          // 写账号快照（sparkline 用）
          await upsertSnapshot({
            account_id: acc.id,
            snapshot_date: collectDate,
            follower_count: resp.account.followerCount ?? null,
            total_favorited: resp.account.totalFavorited ?? null,
            aweme_count: resp.account.awemeCount ?? null,
            redfox_index: resp.account.redfoxIndex ?? null,
            metrics_json: null,
          });
          all.push(...transformCrawler(resp as never, collectDate));
        } catch {
          // 单账号失败跳过
        }
      }
      inputs = all;
      break;
    }
    case "douyin-subscribe": {
      const accounts = (await listActiveAccounts()).filter((a) => a.track_growth === 1);
      if (!accounts.length) {
        return { skillId: sid, status: "skipped", fetched: 0, inserted: 0 };
      }
      const all: typeof inputs = [];
      const endDate = collectDate;
      // 订阅：拉过去 7 天作品（用 startDate = endDate - 6）
      const d = new Date(collectDate + "T00:00:00+08:00");
      d.setDate(d.getDate() - 6);
      const startDate = d.toISOString().slice(0, 10);
      for (const acc of accounts) {
        try {
          const items = (await runner({
            accountId: acc.douyin_id,
            accountName: acc.display_name ?? undefined,
            publishTimeStart: startDate,
            publishTimeEnd: endDate,
          })) as unknown[];
          all.push(
            ...transformSubscribe(
              items as never,
              acc.douyin_id,
              acc.display_name ?? "",
              collectDate
            )
          );
        } catch {
          // 跳过
        }
      }
      inputs = all;
      break;
    }
    default:
      return { skillId: sid, status: "skipped", fetched: 0, inserted: 0 };
  }

  // follower 过滤（user requirement #1）
  const beforeFilter = inputs.length;
  if (ff.enabled) {
    inputs = inputs.filter((i) => passesFollowerFilter(i.author_followers ?? null, ff.max));
  }

  const inserted = await insertMany(inputs);
  return {
    skillId: sid,
    status: "ok",
    fetched: beforeFilter,
    inserted,
  };
}

/** 回填：仅 leaderboards，按天补 backfillDays 天 */
export async function backfill(days = 30): Promise<RunAllResult[]> {
  const today = todayYMD();
  const out: RunAllResult[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today + "T00:00:00+08:00");
    d.setDate(d.getDate() - i);
    const ymd = d.toISOString().slice(0, 10);
    // 仅回填 3 个榜单
    const r = await runAll({
      skillIds: ["douyin-content-surge", "douyin-weekly-surge", "douyin-daily-hot"],
      collectDate: ymd,
    });
    out.push(r);
  }
  return out;
}

/** 仅用于脚本：上次同步日（用于 backfill skip） */
export { latestCollectDate };