// Cron 入口：每天 09:00 Asia/Shanghai 自动 runAll
// HMR 安全 + Next.js edge 守卫 + Vercel 守卫
//
// dev 本地：使用 node-cron 调度
// Vercel prod：不启动 node-cron（容器会被回收，任务丢失），由 Vercel Cron
//   通过 vercel.json 配置的定时任务触发 /api/cron/run

import cron, { type ScheduledTask } from "node-cron";
import { getDb } from "./db";
import { runAll } from "./skills/run-all";

const GLOBAL_KEY = "__cronStarted";
const GLOBAL_TASK = "__cronTask";

declare global {
  // eslint-disable-next-line no-var
  var __cronStarted: boolean | undefined;
  // eslint-disable-next-line no-var
  var __cronTask: ScheduledTask | undefined;
}

export async function startCron(): Promise<void> {
  // Next.js 在 edge runtime 或 build 阶段也会调用 instrumentation.ts，跳过
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return;
  // 仅在显式禁用时跳过（CI / 单元测试）
  if (process.env.DISABLE_CRON === "1") return;
  // Vercel 上：不要启 node-cron（容器会回收，cron 任务丢失；改用 Vercel Cron 触发 HTTP）
  if (process.env.VERCEL === "1") return;

  if (globalThis[GLOBAL_KEY]) return; // HMR 守卫
  globalThis[GLOBAL_KEY] = true;

  // 确保 DB 已初始化（迁移 + seed）
  await getDb();

  const task = cron.schedule(
    "0 9 * * *",
    async () => {
      console.log("[cron] daily 09:00 trigger", new Date().toISOString());
      try {
        const result = await runAll({});
        console.log(
          `[cron] done: status=${result.status} inserted=${result.totalInserted}`
        );
      } catch (e) {
        console.error("[cron] failed:", e);
      }
    },
    {
      timezone: "Asia/Shanghai",
    }
  );
  globalThis[GLOBAL_TASK] = task;
  console.log("[cron] scheduled: '0 9 * * *' Asia/Shanghai");

  // RUN_CRON_NOW=1 用于本地调试：启动后立即跑一次
  if (process.env.RUN_CRON_NOW === "1") {
    runAll({})
      .then((r) =>
        console.log(`[cron] immediate run: status=${r.status} inserted=${r.totalInserted}`)
      )
      .catch((e) => console.error("[cron] immediate failed:", e));
  }
}

export function stopCron(): void {
  const t = globalThis[GLOBAL_TASK];
  if (t) {
    t.stop();
    globalThis[GLOBAL_TASK] = undefined;
  }
  globalThis[GLOBAL_KEY] = false;
}
