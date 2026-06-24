// 调试脚本：调用单个 skill，打印原始 JSON 响应
// 用法: npx tsx scripts/dump-skill.ts douyin-content-surge [args...]

import { SKILLS, SKILL_RUNNERS, type SkillId } from "../lib/skills/types";

async function main() {
  const id = process.argv[2] as SkillId | undefined;
  if (!id) {
    console.error("Usage: tsx scripts/dump-skill.ts <skill-id> [json-args]");
    console.error("Available skills:");
    for (const s of SKILLS) console.error(`  - ${s.id}`);
    process.exit(1);
  }

  const skill = SKILLS.find((s) => s.id === id);
  if (!skill) {
    console.error(`Unknown skill: ${id}`);
    process.exit(1);
  }

  let args: Record<string, unknown> = {};
  const raw = process.argv[3];
  if (raw) {
    try {
      args = JSON.parse(raw);
    } catch {
      console.error("Args must be JSON");
      process.exit(1);
    }
  }

  console.log(`▶ Calling ${skill.id} (${skill.name})`);
  console.log(`  endpoint: ${skill.endpoint}`);
  console.log(`  source: ${skill.source}`);
  console.log(`  args: ${JSON.stringify(args)}`);
  console.log();

  const fn = SKILL_RUNNERS[skill.id];
  const t0 = Date.now();
  try {
    const result = await fn(args);
    const ms = Date.now() - t0;
    console.log(`OK (${ms}ms)`);
    const out = JSON.stringify(result, null, 2);
    if (out.length > 3000) {
      console.log(out.slice(0, 3000) + "\n... [truncated]");
    } else {
      console.log(out);
    }
    let nItems = -1;
    if (Array.isArray(result)) {
      nItems = result.length;
    } else if (result && typeof result === "object") {
      const obj = result as Record<string, unknown>;
      const candidateKeys = ["articles", "list", "workList", "dailyRank", "weeklyRank"];
      for (const k of candidateKeys) {
        if (Array.isArray(obj[k])) {
          nItems = (obj[k] as unknown[]).length;
          break;
        }
      }
      if (nItems < 0 && "account" in obj) {
        const r = obj as { account?: unknown; workList?: unknown[] };
        nItems = Array.isArray(r.workList) ? r.workList.length : 0;
      }
    }
    console.log(`\n[${nItems} items returned]`);
  } catch (err) {
    console.error(`FAILED:`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

main();
