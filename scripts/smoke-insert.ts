// Smoke test: 跑一次 run-all，看真实数据是否写入 DB
// 用法: npx tsx --env-file=.env.local scripts/smoke-insert.ts

import { runAll } from "../lib/skills/run-all";
import { bySourceCount, totalCount } from "../lib/repo/contents";
import { getSkillsEnabled, setSkillEnabled } from "../lib/repo/settings";
import { getDb } from "../lib/db";

async function main() {
  // 强制开启所有 skill
  for (const sid of [
    "douyin-content-surge",
    "douyin-weekly-surge",
    "douyin-daily-hot",
    "douyin-search",
    "douyin-realtime-search",
    "douyin-works-crawler",
    "douyin-subscribe",
  ]) {
    await setSkillEnabled(sid, true);
  }
  // 注入 2 个测试关键词（确保 douyin-search 也能跑）
  const { setAutoKeywords } = await import("../lib/repo/settings");
  await setAutoKeywords(["Claude", "Vibe Coding"]);

  await getDb(); // 触发迁移 + seed
  console.log("[smoke] skills_enabled =", await getSkillsEnabled());

  const result = await runAll({ forceAll: true });

  console.log("\n=== run-all result ===");
  console.log("runId:", result.runId);
  console.log("collectDate:", result.collectDate);
  console.log("status:", result.status);
  console.log("totalInserted:", result.totalInserted);
  console.log("per-skill:");
  for (const s of result.skills) {
    console.log(
      `  ${s.skillId}: ${s.status}  fetched=${s.fetched}  inserted=${s.inserted}${s.error ? "  err=" + s.error : ""}`
    );
  }
  if (result.error) console.log("error:", result.error);

  console.log("\n=== DB stats ===");
  console.log("total rows:", await totalCount());
  console.log("by source:", await bySourceCount());
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
