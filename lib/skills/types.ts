// Skill 编排层 - 重新导出 registry 并提供 SKILL_RUNNERS 映射

export * from "./registry";
export type { SkillId, SkillCategory, SkillDef } from "./registry";
export { SKILLS, getSkill } from "./registry";

// 动态 import 避免循环依赖（dump-skill.ts 等需要此映射）
import type { SkillId } from "./registry";

type Runner = (args: Record<string, unknown>) => Promise<unknown>;

export const SKILL_RUNNERS: Record<SkillId, Runner> = {
  "douyin-content-surge": (a) => import("./douyin-content-surge").then((m) => m.run(a as never)),
  "douyin-weekly-surge": (a) => import("./douyin-weekly-surge").then((m) => m.run(a as never)),
  "douyin-daily-hot": (a) => import("./douyin-daily-hot").then((m) => m.run(a as never)),
  "douyin-search": (a) => import("./douyin-search").then((m) => m.run(a as never)),
  "douyin-realtime-search": (a) => import("./douyin-realtime-search").then((m) => m.run(a as never)),
  "douyin-works-crawler": (a) => import("./douyin-works-crawler").then((m) => m.run(a as never)),
  "douyin-subscribe": (a) => import("./douyin-subscribe").then((m) => m.run(a as never)),
};
