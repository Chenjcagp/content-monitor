import type {
  Category,
  ContentItem,
  DailyReport,
  PlatformId,
  Topic,
} from "./types";
import { TODAY, addDays, formatYMD } from "./date";
import { PLATFORMS } from "./platforms";

// ─────────────────────────────────────────────────────────────
//  选题素材库（按分类），用于生成 mock 内容
// ─────────────────────────────────────────────────────────────
const CLAUDE_CODE_TEMPLATES = [
  {
    title: "Claude Code Skills 完全指南：从入门到自定义",
    excerpt:
      "Anthropic 推出的 Skills 机制让 Claude Code 能像加载插件一样调用预设能力。本文拆解 Skills 的工作原理、目录结构、常见用例。",
    author: "硅基观察",
    tags: ["ClaudeCode", "Skills", "AI编程"],
  },
  {
    title: "我用 Claude Code 重构了整个 Next.js 项目，踩了 3 个坑",
    excerpt:
      "从 create-next-app 开始把 50 个组件逐一交给 Claude Code 重构，记录每次失败的 prompt 与修复策略。",
    author: "前端队长",
    tags: ["ClaudeCode", "Nextjs", "重构"],
  },
  {
    title: "Claude Code Hooks 实战：把 Lint / Test 串成自动化流水线",
    excerpt:
      "在 .claude/settings.json 中配置 hooks，让每次工具调用前自动跑 ESLint、每次写文件后自动跑测试。",
    author: "工程效能笔记",
    tags: ["ClaudeCode", "Hooks", "工程化"],
  },
  {
    title: "Claude Sonnet 4.6 编程能力实测：30 道 LeetCode 跑分对比",
    excerpt:
      "使用 30 道 Hard 难度的算法题，对比 Sonnet 4.6 与 GPT-4o、DeepSeek V3 的通过率与耗时。",
    author: "AI 评测室",
    tags: ["ClaudeCode", "模型评测"],
  },
  {
    title: "Vibe Coding 时代的产品经理新工作流",
    excerpt:
      "当 PM 自己能用 Claude Code 半天搭出原型，传统的 PRD + 评审流程会被怎样重新定义？",
    author: "产品沉思录",
    tags: ["Vibecoding", "产品经理"],
  },
  {
    title: "把 Claude Code 接入飞书，做一个团队知识库机器人",
    excerpt:
      "通过 MCP 协议让 Claude Code 调用飞书的读写 API，自动汇总群聊精华到知识库。",
    author: "效率黑客",
    tags: ["ClaudeCode", "MCP", "飞书"],
  },
  {
    title: "Claude Code vs Cursor vs Windsurf：三周深度对比",
    excerpt:
      "在同一个 React Native 项目上同时使用三个工具，从补全准确率、上下文长度、命令调用三个维度横评。",
    author: "独立开发者日记",
    tags: ["ClaudeCode", "Cursor", "横评"],
  },
  {
    title: "Anthropic 发布 Computer Use：AI 开始能直接操作电脑",
    excerpt:
      "官方演示 Claude 自主打开浏览器、填写表单、操作 IDE 的视频引爆讨论，本文解析其技术实现与边界。",
    author: "硬核技术",
    tags: ["ClaudeCode", "ComputerUse"],
  },
  {
    title: "Claude Code 在后端 CRUD 中的代码质量分析",
    excerpt:
      "把同一份接口文档丢给 Claude Code 与 Copilot，对比生成的 Go 代码在错误处理、命名、可测试性上的差异。",
    author: "后端老炮",
    tags: ["ClaudeCode", "后端", "代码质量"],
  },
  {
    title: "我是怎么用 Claude Code 给开源项目贡献 PR 的",
    excerpt:
      "从 issue 筛选、fork 仓库、跑通测试，到最终合入，分享一次完整的 AI 辅助贡献流程。",
    author: "GitHub 玩家",
    tags: ["ClaudeCode", "开源", "GitHub"],
  },
];

const VIBECODING_TEMPLATES = [
  {
    title: "Vibe Coding 入门：我让 AI 帮我写了一个 SaaS",
    excerpt:
      "不会写代码的产品经理，用 Cursor + Claude 从 0 到 1 做了一个订阅管理工具的全过程复盘。",
    author: "PM 转码日记",
    tags: ["Vibecoding", "SaaS"],
  },
  {
    title: "Lovable / Bolt / v0 三家 AI 建站工具横评",
    excerpt:
      "同样一句话 prompt，三家工具产出的页面质量、交互完整度、可二次开发性大相径庭。",
    author: "独立开发者联盟",
    tags: ["Vibecoding", "AI建站"],
  },
  {
    title: "Vibe Coding 项目的可维护性陷阱",
    excerpt:
      "AI 生成的代码 3 个月后没人看得懂，需求变更无从下手——这是 Vibe Coding 最常见的死亡螺旋。",
    author: "架构师札记",
    tags: ["Vibecoding", "可维护性"],
  },
  {
    title: "我用 Vibe Coding 一周做出月入 $3000 的 Chrome 插件",
    excerpt:
      "从 idea 验证、UI 设计、上架审核到冷启动，分享真实数据和踩过的坑。",
    author: "Indie Hacker 周刊",
    tags: ["Vibecoding", "Chrome插件", "独立开发"],
  },
  {
    title: "Prompt Engineering 已死，Context Engineering 才是未来",
    excerpt:
      "Andrej Karpathy 的最新观点引发讨论：把上下文管理好比把 prompt 写好重要 10 倍。",
    author: "AI 前线",
    tags: ["Vibecoding", "Prompt", "Context"],
  },
  {
    title: "Vibe Coding 时代的设计师转型指南",
    excerpt:
      "当设计师能自己出可交互原型，不再需要前端排期——设计师的边界要重新画在哪里？",
    author: "设计大爆炸",
    tags: ["Vibecoding", "设计师"],
  },
  {
    title: "AI 写的代码到底要不要 Code Review？",
    excerpt:
      "调查显示 62% 的团队把 AI 代码当成「可信赖但需审查」，但审查成本可能比写代码还高。",
    author: "研发管理观察",
    tags: ["Vibecoding", "CodeReview"],
  },
  {
    title: "把 Figma 设计稿丢给 Cursor，2 小时上线 iOS App",
    excerpt:
      "完整录制从 Figma 导出、Cursor 解析、自动生成 SwiftUI 代码、TestFlight 上线的全过程。",
    author: "Swift 速通",
    tags: ["Vibecoding", "iOS", "Figma"],
  },
  {
    title: "为什么 Vibe Coding 项目总是在 demo 阶段就死掉",
    excerpt:
      "分析了 50 个公开失败的 Vibe Coding 项目，归纳出 5 种最常见的「做完 demo 就再没更新」的原因。",
    author: "产品复盘局",
    tags: ["Vibecoding", "失败复盘"],
  },
  {
    title: "Cursor 0.45 更新：Agent 模式终于能用了",
    excerpt:
      "新版本支持多文件编辑、终端调用、错误自动修复，被社区评价为「终于追上 Claude Code」。",
    author: "工具控阿伟",
    tags: ["Vibecoding", "Cursor"],
  },
];

// 不同平台的命名风格
const AUTHOR_NAMES: Record<PlatformId, string[]> = {
  douyin: ["AI 工具说", "硬核技术", "产品沉思录", "代码兄弟", "效率黑客"],
  xiaohongshu: [
    "AI 编程日记",
    "产品小妹",
    "独立开发者 Linda",
    "数字游民 Anna",
    "前端妹妹",
  ],
  weibo: ["AI 前线", "硬核技术", "互联网圈内人", "科技博主王亮", "硅基观察"],
  bilibili: ["老王说编程", "代码兄弟", "AI 评测室", "程序员鱼皮", "硬核技术君"],
  wechat: ["硅基观察", "AI 前线", "工程效能笔记", "产品沉思录", "架构师札记"],
  zhihu: ["匿名用户", "前端队长", "后端老炮", "独立开发者联盟", "工具控阿伟"],
};

// 固定种子随机数（保证多次渲染结果一致）
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

function pick<T>(arr: T[], rnd: () => number): T {
  return arr[Math.floor(rnd() * arr.length)];
}

function generateContentForCategory(
  categoryId: string,
  templates: typeof CLAUDE_CODE_TEMPLATES,
  platforms: PlatformId[],
  days: number
): ContentItem[] {
  const items: ContentItem[] = [];
  const rnd = seeded(categoryId.charCodeAt(0) * 137);

  for (let d = 0; d < days; d++) {
    const date = formatYMD(addDays(TODAY, -d));
    // 每天每平台 1-4 条
    platforms.forEach((p) => {
      const count = Math.floor(rnd() * 4) + 1;
      for (let i = 0; i < count; i++) {
        const tpl = pick(templates, rnd);
        const author = pick(AUTHOR_NAMES[p], rnd);
        const hour = Math.floor(rnd() * 14) + 8; // 08:00 - 22:00
        const minute = Math.floor(rnd() * 60);
        const likes = Math.floor(rnd() * 50000) + 500;
        const comments = Math.floor(likes * (0.05 + rnd() * 0.1));
        const shares = Math.floor(likes * (0.02 + rnd() * 0.05));
        items.push({
          id: `${categoryId}-${date}-${p}-${i}`,
          categoryId,
          platform: p,
          author,
          avatarHue: Math.floor(rnd() * 360),
          title: tpl.title,
          excerpt: tpl.excerpt,
          publishTime: `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`,
          collectDate: date,
          metrics: {
            likes,
            comments,
            shares,
            views:
              p === "bilibili" || p === "douyin"
                ? likes * (10 + Math.floor(rnd() * 20))
                : undefined,
          },
          tags: tpl.tags,
        });
      }
    });
  }

  // 按热度排序
  return items.sort((a, b) => b.metrics.likes - a.metrics.likes);
}

function generateTopicsForCategory(
  categoryId: string,
  templates: typeof CLAUDE_CODE_TEMPLATES,
  days: number
): Topic[] {
  const topics: Topic[] = [];
  const rnd = seeded(categoryId.charCodeAt(1) * 233);

  for (let d = 0; d < days; d++) {
    const date = formatYMD(addDays(TODAY, -d));
    // 每天 3-5 个选题
    const count = Math.floor(rnd() * 3) + 3;
    const used = new Set<string>();
    for (let i = 0; i < count; i++) {
      let tpl = pick(templates, rnd);
      let guard = 0;
      while (used.has(tpl.title) && guard < 8) {
        tpl = pick(templates, rnd);
        guard++;
      }
      used.add(tpl.title);
      topics.push({
        id: `${categoryId}-topic-${date}-${i}`,
        categoryId,
        reportDate: date,
        title: tpl.title,
        whyDoIt: `近 24 小时内「${tpl.tags[0]}」相关内容搜索量提升 ${Math.floor(
          rnd() * 80 + 30
        )}%，但头部账号尚未系统性覆盖，是抢首发的窗口期。`,
        viralPoint: `${pick(
          ["实操复盘类", "数据横评类", "踩坑避雷类", "入门科普类"],
          rnd
        )}内容在同类话题中互动率高出均值 ${(rnd() * 3 + 1).toFixed(1)} 倍。`,
        growthSpace: `可以延展至 ${pick(
          ["B 站长视频", "公众号深度文", "小红书图文卡片", "抖音口播"],
          rnd
        )}等多平台分发，长尾搜索流量预计 3 个月内可持续增长。`,
        relatedContentCount: Math.floor(rnd() * 8) + 3,
        tags: tpl.tags,
        heat: Math.floor(rnd() * 3) + 3, // 3-5
      });
    }
  }

  return topics;
}

function buildReport(
  categoryId: string,
  topics: Topic[],
  daysBack: number
): DailyReport {
  const date = formatYMD(addDays(TODAY, -daysBack));
  const dayTopics = topics.filter((t) => t.reportDate === date);
  const status: DailyReport["status"] =
    daysBack === 0 ? "generating" : daysBack < 5 ? "ready" : "ready";

  return {
    date,
    categoryId,
    generatedAt: daysBack === 0 ? "处理中…" : `08:${String(30 + daysBack).padStart(2, "0")}`,
    status,
    topics: dayTopics.sort((a, b) => b.heat - a.heat),
    hotRecap: [
      `${dayTopics[0]?.title ?? "暂无"} 在 ${pick(["抖音", "微博", "B站"], () => 0.4)} 进入热榜 TOP 10`,
      `相关创作者互动量环比 +${Math.floor(Math.random() * 80 + 20)}%`,
      `评论区高频关键词：${pick(
        ["效率", "可维护", "对比", "踩坑", "教程"],
        () => Math.random()
      )}、${pick(["实战", "复盘", "工具", "教程", "对比"], () => Math.random())}`,
    ],
    oneLiner: dayTopics.length
      ? `今日重点关注「${dayTopics[0].title.split("：")[0]}」方向，可优先布局。`
      : "今日尚无新增选题，建议复盘近 3 天未深挖的标签。",
  };
}

// ─────────────────────────────────────────────────────────────
//  导出：mock 数据集
// ─────────────────────────────────────────────────────────────

export const CATEGORIES: Category[] = [
  {
    id: "claudecode",
    name: "ClaudeCode 选题监控",
    description:
      "围绕 Claude Code / Anthropic 生态的编程工具、Skills、Hooks、MCP 等内容选题。",
    enabledPlatforms: ["douyin", "xiaohongshu", "weibo", "bilibili", "wechat", "zhihu"],
    keywords: [
      "Claude Code",
      "Claude Sonnet",
      "Skills",
      "MCP",
      "Computer Use",
      "Anthropic",
      "Vibe Coding",
    ],
    bloggers: [
      { id: "b1", name: "硅基观察", platform: "wechat", followers: "12.8万" },
      { id: "b2", name: "AI 前线", platform: "wechat", followers: "8.3万" },
      { id: "b3", name: "硬核技术", platform: "weibo", followers: "23.5万" },
      { id: "b4", name: "老王说编程", platform: "bilibili", followers: "45.2万" },
      { id: "b5", name: "AI 工具说", platform: "douyin", followers: "6.7万" },
    ],
    createdAt: "2026-05-12",
  },
  {
    id: "vibecoding",
    name: "Vibecoding 选题监控",
    description:
      "聚焦 Vibe Coding / AI 辅助编程 / 独立开发领域，关注产品化与商业化趋势。",
    enabledPlatforms: ["douyin", "xiaohongshu", "weibo", "bilibili", "zhihu"],
    keywords: [
      "Vibe Coding",
      "Cursor",
      "Lovable",
      "Bolt",
      "独立开发",
      "Indie Hacker",
      "Prompt Engineering",
    ],
    bloggers: [
      { id: "b6", name: "PM 转码日记", platform: "xiaohongshu", followers: "3.2万" },
      { id: "b7", name: "独立开发者联盟", platform: "zhihu", followers: "15.4万" },
      { id: "b8", name: "Indie Hacker 周刊", platform: "wechat", followers: "5.6万" },
      { id: "b9", name: "代码兄弟", platform: "douyin", followers: "28.1万" },
      { id: "b10", name: "工具控阿伟", platform: "bilibili", followers: "11.9万" },
    ],
    createdAt: "2026-05-20",
  },
];

export const CONTENT_BY_CATEGORY: Record<string, ContentItem[]> = {
  claudecode: generateContentForCategory(
    "claudecode",
    CLAUDE_CODE_TEMPLATES,
    CATEGORIES[0].enabledPlatforms,
    14
  ),
  vibecoding: generateContentForCategory(
    "vibecoding",
    VIBECODING_TEMPLATES,
    CATEGORIES[1].enabledPlatforms,
    14
  ),
};

export const TOPICS_BY_CATEGORY: Record<string, Topic[]> = {
  claudecode: generateTopicsForCategory(
    "claudecode",
    CLAUDE_CODE_TEMPLATES,
    7
  ),
  vibecoding: generateTopicsForCategory(
    "vibecoding",
    VIBECODING_TEMPLATES,
    7
  ),
};

export const REPORTS_BY_CATEGORY: Record<string, DailyReport[]> = {
  claudecode: Array.from({ length: 7 }, (_, i) =>
    buildReport("claudecode", TOPICS_BY_CATEGORY.claudecode, i)
  ),
  vibecoding: Array.from({ length: 7 }, (_, i) =>
    buildReport("vibecoding", TOPICS_BY_CATEGORY.vibecoding, i)
  ),
};

// ─────────────────────────────────────────────────────────────
//  查询辅助函数
// ─────────────────────────────────────────────────────────────

export function getCategory(id: string): Category | undefined {
  return CATEGORIES.find((c) => c.id === id);
}

export function getCategoryContent(
  categoryId: string,
  platform?: PlatformId | "all",
  date?: string
): ContentItem[] {
  const all = CONTENT_BY_CATEGORY[categoryId] ?? [];
  return all.filter((c) => {
    if (platform && platform !== "all" && c.platform !== platform) return false;
    if (date && c.collectDate !== date) return false;
    return true;
  });
}

export function getCategoryReports(categoryId: string): DailyReport[] {
  return REPORTS_BY_CATEGORY[categoryId] ?? [];
}

export function getCategoryTopics(categoryId: string): Topic[] {
  return TOPICS_BY_CATEGORY[categoryId] ?? [];
}