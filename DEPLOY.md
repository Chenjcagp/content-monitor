# 部署指南 · Vercel + Turso + Vercel Cron

把"内容雷达"demo 部署到公网，让用户能通过 URL 访问并保留数据。

## 总体架构

```
浏览器 ──https──> Vercel (Next.js)
                      │
                      ├─ 静态页面
                      └─ API Routes (Node runtime)
                            │
                            ├─ 每次请求：连 Turso 远端 SQLite（libsql 协议）
                            │
                            └─ Vercel Cron（每天 01:00 UTC = 09:00 Asia/Shanghai）
                                  │
                                  └─ 调 /api/cron/run（带 CRON_SECRET 鉴权）
                                        │
                                        └─ 7 个 Redfox skill 采集 → 写 Turso
```

dev 本地开发仍然走 `data/app.db` 文件 SQLite（无网络延迟、调试方便），prod 走 Turso。

---

## 1. 注册 Turso 账号 + 建库

### 1.1 安装 Turso CLI

macOS：
```bash
brew install tursodatabase/tap/turso
```

Windows（PowerShell）：
```powershell
irm https://get.turso.tech/install.ps1 | iex
```

### 1.2 登录 + 建库

```bash
turso auth login                        # 浏览器登录
turso db create content-monitor        # 建库
turso db show content-monitor          # 拿到 URL，类似：
# URL : libsql://content-monitor-<your-name>.turso.io
```

### 1.3 拿到 auth token

```bash
turso db tokens create content-monitor
# 输出：eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9....（长字符串）
```

记下两样东西：
- `DATABASE_URL = libsql://content-monitor-<your-name>.turso.io`
- `DATABASE_AUTH_TOKEN = eyJhbGci...`

### 1.4 （可选）手动连 Turso 看一眼

```bash
turso db shell content-monitor
> .tables
> SELECT COUNT(*) FROM settings;
> .quit
```

---

## 2. 注册 Vercel + 部署

### 2.1 推代码到 Git

```bash
git init
git add .
git commit -m "ready for deploy"
# 在 GitHub 新建 repo 并 push
git remote add origin https://github.com/<you>/content-monitor.git
git push -u origin main
```

### 2.2 Vercel 导入项目

1. 打开 https://vercel.com/new
2. 选 GitHub 仓库 → 选 `content-monitor`
3. Framework Preset 选 **Next.js**（自动识别）
4. **不要**勾 "Override" 任何 build command
5. 点 "Deploy"（**先不传 env**，让它先走通 build，失败再回来看 log）

### 2.3 配置环境变量

进 Vercel 项目 → Settings → Environment Variables，**Production** 下加 4 条：

| Key | Value | 说明 |
|---|---|---|
| `REDFOX_API_KEY` | `ak_c239cdee25864c09bce134a83a9ec11f` | 你的 Redfox key |
| `REDFOX_BASE_URL` | `https://redfox.hk` | API base |
| `DATABASE_URL` | `libsql://content-monitor-xxx.turso.io` | 步骤 1.2 拿到的 |
| `DATABASE_AUTH_TOKEN` | `eyJhbGci...` | 步骤 1.3 拿到的 |
| `CRON_SECRET` | `$(openssl rand -hex 32)` | 用于 cron 鉴权；本机用 `openssl rand -hex 32` 生成 |

**重要**：Vercel Cron 会**自动**读取 `CRON_SECRET`，并以 `Authorization: Bearer <CRON_SECRET>` 调 `/api/cron/run`（这是 Vercel 平台的机制，不是我们的代码）。

### 2.4 重新部署

加完 env 后 → Deployments → 右上"..."→ Redeploy，Vercel 会用新 env 重新 build。

---

## 3. 触发首次同步

### 3.1 手动触发（立即跑一次）

Vercel 上"立即运行一次"按钮要带 secret 才能调 `/api/cron/run`（防滥用），所以需要 curl：

```bash
curl -X POST "https://<your-app>.vercel.app/api/cron/run" \
  -H "Authorization: Bearer <你的 CRON_SECRET>"
```

返回：
```json
{
  "ok": true,
  "runId": 1,
  "status": "ok",
  "collectDate": "2026-06-24",
  "totalInserted": 220,
  "skills": [...]
}
```

如果 totalInserted > 0：成功，DB 里有数据了。

### 3.2 验证数据落地

```bash
# 在浏览器打开
https://<your-app>.vercel.app/api/cron/status
```

返回里有 `totalContents: 220`，说明 220 条内容已写入 Turso。

打开首页 https://<your-app>.vercel.app → 侧边栏应出现分类 → 进 `/category/claudecode/content` 看真实内容。

### 3.3 验证 Vercel Cron 调度

进 Vercel 项目 → **Settings → Cron Jobs**，应看到：
- Path: `/api/cron/run`
- Schedule: `0 1 * * *` (UTC)
- 显示**下次触发时间**

每天 01:00 UTC (= 09:00 Asia/Shanghai ±1h) 会自动跑。

---

## 4. 本地开发与部署联调

dev 本地仍然用本地 SQLite，不连 Turso：

```bash
# 普通本地开发
npm run dev
# 浏览器 http://localhost:3000
# DB 落在 data/app.db（gitignore）
```

如果想在本地**连远端 Turso**（比如调试线上数据）：

```bash
# 临时 .env.local.turso
cat > .env.local.turso <<EOF
REDFOX_API_KEY=ak_c239cdee25864c09bce134a83a9ec11f
REDFOX_BASE_URL=https://redfox.hk
DATABASE_URL=libsql://content-monitor-<your>.turso.io
DATABASE_AUTH_TOKEN=eyJ...
CRON_SECRET=dev  # 本地不强制鉴权
EOF

env $(grep -v '^#' .env.local.turso | xargs) npm run dev
# 浏览器连 localhost 但读写 Turso
```

---

## 5. 数据迁移（首次部署时把本地数据搬过去）

**简单办法**（推荐）：在 Turso 上让系统重新跑一次：
```bash
# 部署到 Vercel 后，curl 触发
curl -X POST "https://<your-app>.vercel.app/api/cron/run" \
  -H "Authorization: Bearer <CRON_SECRET>"
# 只跑今天 1 天，再跑 backfill 回填历史 30 天
curl -X POST "https://<your-app>.vercel.app/api/cron/backfill?days=30" \
  -H "Authorization: Bearer <CRON_SECRET>"
```

**完整迁移**（含历史 30 天）：用 `turso db shell` 导入本地 dump：
```bash
# 本地导出
sqlite3 data/app.db .dump > data/app.sql

# 远程导入（Turso CLI 1.0+ 支持）
turso db shell content-monitor < data/app.sql
```

---

## 6. 关键文件改动一览

| 文件 | 改动 |
|---|---|
| `lib/db.ts` | 双驱动 adapter：本地 better-sqlite3 / 远端 @libsql/client |
| `lib/repo/*.ts` (6 个) | 全部 sync → async；签名加 `Promise<>` |
| `lib/skills/run-all.ts` | 内部 repo 调用全部 await |
| `lib/cron.ts` | Vercel 上不启 node-cron；Vercel Cron 走 HTTP |
| `instrumentation.ts` | `await startCron()` |
| `app/api/**/route.ts` (13 个) | repo 调用 await；加 `export const runtime = "nodejs"` |
| `app/api/cron/run/route.ts` | 加 `CRON_SECRET` 鉴权 |
| `app/category/[id]/layout.tsx` | async layout |
| `components/CategoryHeader.tsx` | async server component |
| `vercel.json` | **新增**：`{ crons: [{ path, schedule }] }` |
| `next.config.mjs` | `serverExternalPackages: ["better-sqlite3", "@libsql/client"]` |
| `.env.example` | 加 `DATABASE_URL` / `DATABASE_AUTH_TOKEN` / `CRON_SECRET` |
| `package.json` | 加 `"@libsql/client": "^0.17.4"` + `"@types/better-sqlite3"` devDep |

---

## 7. 故障排查

| 现象 | 排查 |
|---|---|
| Vercel build 失败：找不到 `better-sqlite3` native binding | `next.config.mjs` 的 `serverExternalPackages` 已包含；如仍报错，确认 node 版本 20.x（Vercel 默认） |
| Vercel Function 报 `Cannot find module '@libsql/client'` | 确认 `npm i @libsql/client` 已写入 `package.json` dependencies |
| `/api/cron/run` 返回 401 | 缺 `Authorization: Bearer <CRON_SECRET>` header；Vercel Cron 调时**自动**会带，手动 curl 要手动加 |
| `/api/cron/run` 在 Vercel 上不跑 | 确认 Vercel dashboard Cron Jobs 列表里有 `/api/cron/run`；Vercel Hobby plan 限制 cron 仅可访问同一项目的路由 |
| Turso 写入慢 / 超时 | 用 `turso db show` 看 region 是不是离 Vercel function 远；可考虑用 `latency_mode = "low-latency"` |
| Turso 上 `WAL` 相关错误 | libsql 不需要 `PRAGMA journal_mode = WAL`；我们的 schema 已去掉（PRAGMA 移到 db.ts 里按环境决定） |

---

## 8. 部署后建议做的几件事

1. **添加 Vercel 域名**（如果有）：Settings → Domains
2. **监控 Vercel Cron 失败**：Cron Jobs 页能看到每次执行的状态码；失败会发邮件
3. **Turso 备份**（可选）：`turso db replica create content-monitor --location <region>` 开副本
4. **CRON_SECRET 轮换**：在 Vercel 改 env → 重新部署，旧的 cron 调用会 401 直到新 secret 生效

---

## 9. 不在本文档范围（v3+）

- Categories 多用户 / 权限系统
- 把"立即运行"按钮改成"通过 Vercel 的 deployment protection bypass token 调用 cron"
- 自动 migrate-to-turso 脚本
- Edge runtime 适配
- 多 region + 嵌入式副本（性能优化）

参见 `lib/db.ts` 顶部注释里的"事务折中"说明（远端模式下 `withTx` 当前是顺序写、非原子 — 我们的两个 withTx 调用点对一致性的依赖不强，可接受；如需强一致后续可改成 `client.batch(...)`）。
