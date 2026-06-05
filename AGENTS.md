# AGENTS.md

## 项目定位
- 唐子航个人 CG 作品集网站；单应用 Next.js 16 App Router 项目。
- 运行栈：React 19、TypeScript strict、Tailwind v4、Framer Motion、Turso(libsql)、Cloudflare R2、Sharp、Zod。

## 先看哪里
- 前台入口 `app/page.tsx` -> `components/home-client.tsx`（数据抓取、5 分钟轮询、visibilitychange 刷新 30s 节流、光标、灯箱、筛选、排序全在此）。
- 后台入口 `app/admin/page.tsx`；子组件在 `components/admin/`。
- API 在 `app/api/**/route.ts`；数据库/鉴权封装在 `lib/db.ts`、`lib/auth.ts`、`proxy.ts`。

## 开发命令
```bash
npm run dev
npm run build
npm run lint
npm run typecheck
npm run db:push
npm run test:schema      # 校验 db.ts 和 push-schema.ts 是否共用一个 schema 源
npm run test:smoke       # HTTP 冒烟（首页 / API / 管理端 CRUD 链路）
npm run test:e2e         # Playwright（自动起本地 dev + 临时 SQLite）
```
- 验证顺序：`lint` → `typecheck` → `test:schema` → `build` → `test:e2e`（CI 执行的顺序）。
- `db:push` 用 `.env.local` 直连 Turso；实际线上 db.ts 首次访问时自动迁移，通常不需要手动跑。

## 数据与迁移
- `lib/db.ts` 的 `db` 是 `Proxy`；首次 DB 访问自动 `runMigrations()`。
- **`lib/schema.ts` 是 schema 单一来源**：`BASE_SCHEMA_SQL` + `COLUMN_PATCHES` + `RECORDED_MIGRATIONS`。`lib/db.ts` 和 `scripts/push-schema.ts` 都引用它；`test:schema` 会验证这一点。改 schema 只改 `lib/schema.ts` 一处。
- `tags`、`software` 在库里是逗号字符串；`lib/db.ts` 的 `tagsToArray()` / `tagsToString()` 负责转换。`lib/work-mappers.ts` 的 `rowToWork()` 统一做 DB 行到类型的映射。
- 数据表：`works`、`work_images`（work_id 关联 works.id，由 API 维护）、`intro`、`details`、`detail_sections`、`schema_migrations`、`audit_logs`、`r2_delete_jobs`。
- `works.software` 字段与 `tags` 一样是逗号串，API 返回数组。
- `intro.tagline` 和 `works.size_weight` 是后期 patch 加的列。

## 上传与存储约束
- 图片上传固定走 `lib/upload-client.ts` 的 `uploadImageToR2()`：`POST /api/upload/presigned` → `PUT` 原图到 R2 → `POST /api/upload/process` 生成 webp 缩略图。
- `/api/upload/process` 要求 `originalKey` 必须以 `originals/` 开头。
- 面向 Vercel/R2；不要引入本地文件持久化，服务端不依赖可写磁盘。
- `Sharp`、`@libsql/client`、R2/S3、`crypto` 只能留在服务端文件，不能混进 `'use client'`。
- **R2 删除是异步的**：删除作品/图片时调用 `enqueueR2Delete()` 写入 `r2_delete_jobs` 表，由 cron（`/api/cron/r2-delete`）按回退重试策略处理。

## 鉴权与后台
- `/admin` 保护依赖 `proxy.ts`，不是 `middleware.ts`。Next 16 下别改回 middleware。
- `/admin?key=...` 支持一次性书签登录；`proxy.ts` 验证 `ADMIN_SECRET_KEY` 后签发 `admin_token` cookie。
- `ADMIN_SECRET_KEY` 缺失时，`proxy.ts` 对 `/admin` 路径返回 503；非 admin 路径放行。排查"本地后台打不开"先查此变量。
- API 写操作约定：先 `requireSameOrigin(req)` → 再 `requireAuth(req)`；返回值非空时直接返回该 `NextResponse`。
- 可选 Upstash Redis 做跨实例限流（`lib/rate-limit-store.ts`）；未配置时自动用进程内存。

## API 安全辅助
- `lib/api-response.ts`：`ok(data)` / `fail(code, msg, status)` 统一返回。
- `lib/api-security.ts`：`requireSameOrigin()` 检查 Origin 头；`rateLimit()` 用 IP 做令牌桶。
- `lib/idempotency-store.ts`：内存幂等缓存，防重复提交。
- `lib/monitoring.ts`：`reportApiError()` / `reportMetric()` 结构化日志，可选 webhook。
- `lib/audit-log.ts`：DB 审计日志。

## 前端约定
- 首页 `components/home-client.tsx`：数据抓取、5 分钟轮询、`visibilitychange` 刷新（30s 节流）、自定义光标、灯箱、筛选、排序。
- 动画基线：`spring` 常用 `damping: 28`、`stiffness: 200`。
- 自定义光标：纯 DOM 操作，不触发 React 渲染。
- Tailwind v4 没有 `tailwind.config.*`；主题变量在 `app/globals.css` 的 `@theme inline`，PostCSS 只配 `@tailwindcss/postcss`。
- 代码不加注释；新增代码英文命名。
- `app/admin/page.tsx` 表单状态用对象整体替换，别用函数式 `setState`。

## 环境
- 必填变量见 `.env.example`：`DATABASE_URL`、`DATABASE_AUTH_TOKEN`、R2 一组、`ADMIN_SECRET_KEY`。
- 可选：`NEXT_PUBLIC_BASE_URL`、`UPSTASH_REDIS_REST_URL`+`UPSTASH_REDIS_REST_TOKEN`、`CRON_SECRET`、`MONITORING_WEBHOOK_URL`。
- 部署在 Vercel，绑定 GitHub 自动部署；域名 `tangzihang.top` 走 Cloudflare 代理。
- 部署命令：`vercel --prod --yes`，网络不稳时 `git push` 触发自动部署。

## Git 约定
- 改动完成后自动 commit 并 push，无需确认。

## 修改时最容易漏的点
- 作品删除/图片删除走异步 R2 清理（`enqueueR2Delete` + cron retry），不是同步删。改相关接口时检查 `app/api/works/[id]/route.ts` 和图片删除路由。
- 仓库里有 `.next/`、`tsconfig.tsbuildinfo`、`.playwright-mcp/` 等生成产物；搜索和编辑时避开。
- `.github/workflows/ci.yml` 在 push/master 和 PR 上跑 `lint → typecheck → test:schema → build → test:e2e`。
