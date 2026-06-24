# 内容雷达 · Content Radar

一个轻量的 Next.js 前端原型，用于演示多平台内容监控 + AI 选题分析工具的核心交互。

## 运行

```bash
npm install
npm run dev
```

打开 http://localhost:3000

## 路由结构

- `/` → 自动跳转到第一个分类
- `/category/claudecode/content` — Tab 1：内容浏览
- `/category/claudecode/analysis` — Tab 2：选题分析与报告
- `/category/claudecode/settings` — Tab 3：监控设置

切换左侧 Sidebar 即可在不同监控分类之间跳转。

## 设计决策

| 交互点 | 方案 | 理由 |
|---|---|---|
| 平台筛选 | 平铺胶囊 + 内容数 | 一眼看全，单击切换，无下拉认知成本 |
| 日期选择 | 横向日期卡片（14 天） | 直接看到哪天有内容，徽章数字引导 |
| 时间线报告 | 报告状态图标（✓/⊙/○） | 用户能直接判断哪天能看报告 |
| 视图切换 | Segmented Control | 二选一场景的标准控件 |

## 目录

```
app/                # Next.js App Router
  category/[id]/    # 按分类的三个 Tab 页面
components/         # 视图组件
lib/                # 类型、假数据、聚合函数
```