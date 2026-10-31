# AGENTS.md · 开发者 / AI Agent 技术文档

ATV Homepage 的架构、技术栈、数据模型、API、本地开发等开发向内容都在本文档。面向使用者的介绍、部署与使用方法见 [README.md](./README.md)。

---

## 1. 整体架构

```
┌────────────────────────── 单个 Cloudflare Worker ──────────────────────────┐
│                                                                            │
│  Static Assets (Vue 3 SPA)          Worker (Hono API)                      │
│  /  index.html  /assets/*           /api/*                                 │
│         │                                │                                 │
│         └────────── 同域部署 ────────────┤                                 │
│                                          ▼                                 │
│                                   Cloudflare D1 (SQLite)                   │
│                                   · links / folders / settings             │
│                                   · 管理员认证、操作日志                     │
└────────────────────────────────────────────────────────────────────────────┘
```

**核心原则：一个 Worker 承担一切。** Cloudflare Workers 现已支持 Static Assets，前端构建产物直接由 Worker 同域托管，无需 Pages + Workers 两套部署、无需处理 CORS，`/api/*` 走 Worker 逻辑，其余路径回落到 SPA 静态资源。

## 2. 技术栈

| 层       | 选型                                                                          | 理由                                                        |
| -------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------- |
| 前端框架 | **Vue 3 + TypeScript + Vite**                                                 | Composition API + `<script setup>`，构建产物纯静态          |
| 状态管理 | Pinia                                                                         | 管理 links / folders / auth 状态                            |
| 路由     | Vue Router（history 模式）                                                    | 单页：`/` = 首页 + 下滑进入的启动台，滚动联动见 §4          |
| 样式     | 自定义 CSS（CSS 变量 + 缓动曲线 + 毛玻璃）                                    | Apple TV 视觉全靠精细的 transform / 模糊 / 渐变控制         |
| 动画     | Lenis 惯性平滑滚动 + CSS transform/opacity + rAF scroll 进度映射              | Apple TV 式缩放、视差、聚焦放大；只动 GPU 合成层属性，见 §4 |
| 后端框架 | **Hono**                                                                      | 专为 Workers 设计，体积小、TS 友好、内置 cookie 中间件      |
| 数据库   | **Cloudflare D1**（SQLite）                                                   | 免运维、SQL 查询方便排序与事务，免费额度对个人站绰绰有余    |
| 认证     | 密码 SHA-256 摘要常量时间比对 → HMAC-SHA256 签名会话 token（HttpOnly Cookie） | 纯 Web Crypto 实现，无需第三方依赖                          |
| 部署     | Wrangler（`wrangler deploy` 一条命令）                                        | Static Assets + Worker + D1 全部随同一配置发布              |

## 3. 页面设计

### 3.1 首页 `/`（精简）

Apple TV 待机页气质：深色背景 + 模糊光晕，中间留白，图标贴底。

```
┌──────────────────────────────────────────────┐
│            晚上好 · 21:36（小字状态行）        │
│                                              │
│   ┌────────────────────────────────────┐     │
│   │ [必应 ▾] │ 搜索…              (🔍) │     │ ← 搜索框（必应 / 百度 / 谷歌）
│   └────────────────────────────────────┘     │
│                                              │
│   [🖼]   [🖼]   [🖼]   [🖼]   [🖼]           │ ← 7 个快捷网址，像 tvOS 图标坞贴底
│   博客    GitHub  邮箱   音乐    RSS          │   悬停放大 + 光晕
│                    ⌄                         │ ← 下箭头提示（无文字）
└──────────────────────────────────────────────┘
```

- 背景：默认使用内置浅绿渐变壁纸（`web/public/default.jpg`，初始化时写入 `wallpaper_url`）；可在「管理 → 站点」里**自定义壁纸**（站内图片路径、图片链接，或上传本地图片转存），叠加深色遮罩保证可读性，清空后回退深色渐变 + 光晕。
- 顶部一行小字：问候语 + 时钟，可在「站点设置」里关闭时钟或加一句小字备注。
- **中央搜索框**：默认必应，左侧可切换百度 / 谷歌（选择记在浏览器本地），回车或点放大镜在新标签页搜索；宽度与五个图标行对齐。
- 底部图标坞：7 个快捷网址（`is_pinned` 前 7 条），大图标 + 名称，悬停放大、聚焦描边、点击新标签打开。
- 底部下箭头：点击或向下滚动 → 进入启动台（§3.2），滚动过程图标随视差上移淡出。

### 3.2 启动台（下滑进入的第二屏，Apple TV App 网格）

```
┌──────────────────────────────────────────────┐
│  启动台                          [⚙ 管理]     │
│                                              │
│  ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐ ┌──┐              │
│  │图标│ │图标│ │📁│ │图标│ │图标│ │图标│      │ ← 响应式网格
│  └──┘ └──┘ └──┘ └──┘ └──┘ └──┘              │   文件夹显示堆叠图标
│  ...                                          │
│                                              │
│  文件夹展开态：半透明浮层内显示子项              │
└──────────────────────────────────────────────┘
```

- 网格卡片：图标（手动配置的图片链接）+ 名称，悬停放大、键盘可聚焦；未配置图标时用名称首字（字母/汉字）生成渐变占位图。
- 文件夹：图标堆叠 + 名称，点击弹出浮层（Apple TV 文件夹风格），浮层内可再进入子网址。
- 拖拽：登录后可拖拽排序、把网址拖入文件夹归类（桌面端）；移动端用管理面板编辑。
- 管理入口：未登录只读浏览；点击「⚙ 管理」→ 弹出密码框。

### 3.3 管理功能（登录后）

- **新建 / 编辑网址**：标题、URL、图标链接（选填，留空则用名称首字占位）、选择所属文件夹、是否置入首页 7 个快捷位。
- **新建 / 编辑 / 删除文件夹**：名称、主题色。
- **拖拽归类**：把网址拖入文件夹、拖出文件夹。
- **备份 / 恢复**：导出 JSON 下载；粘贴或上传 JSON 覆盖恢复（恢复前二次确认）。

> **弹窗层级约定**：网址 / 文件夹编辑表单走独立居中弹窗（`EditorModal.vue`），不进管理抽屉；
> 「管理」抽屉只负责站点设置与备份，且**只在点「管理内容」时打开**（登录成功、编辑完成均自动关闭，
> 不自动弹出）。z-index 层级：页面 0 → 搜索 20 → 顶栏 40 → 文件夹浮层 60 → 编辑弹窗 / 管理抽屉 70 → 确认框 80 → Toast 90。

## 4. 交互与动画（Apple TV 味道的关键）

所有动画只使用 `transform` / `opacity`（GPU 合成层）+ `will-change`，配长时值强 ease-out 曲线（`cubic-bezier(0.22, 1, 0.36, 1)`），这是"丝滑"的来源：

1. **下滑进入启动台**：Lenis 提供全局惯性平滑滚动；`requestAnimationFrame` 每帧把滚动进度写入 CSS 变量 `--p`，首屏内容随滚动上移、缩小、淡出（`translateY(-70px) scale(0.9)`），启动台网格用 `IntersectionObserver` 触发逐个错峰缩放入场（`--i * 45ms` 阶梯延迟），反向滚动自然回放。
2. **聚焦放大**：卡片 hover / focus 时 `scale(1.08) translateY(-7px)`（弹性曲线），阴影加深，卡片后方彩色光晕从 `scale(0.7)` 绽放，卡面高光跟随指针位置（`--mx/--my` 驱动径向渐变）。
3. **文件夹浮层**：打开时面板从 `scale(0.9) translateY(30px)` 浮出，背景高斯模糊同步渐入，关闭反向缩回；文件夹内子项错峰放大。
4. **抽屉 / 弹窗**：管理抽屉从右侧滑入，确认弹窗中心缩放浮出，删除确认等一律走同一套浮层动画；打开时锁定页面滚动（含 Lenis）。
5. **页面切换**：路由切换用缩放 + 淡入淡出（`out-in`），不用横向滑动；首屏元素按 `--d` 阶梯延迟依次升起。
6. 所有动画遵循 `prefers-reduced-motion`，并支持键盘聚焦（focus 样式）与 Esc 逐层关闭。

> **性能设计（低配机友好）**：① rAF 全部事件驱动——Lenis 循环空闲约 0.5s 后停摆、由 wheel/touchmove/keydown 唤醒；
> 首屏 `--p` 视差只在 scroll 事件内 rAF 节流写入，值不变不写。② backdrop-filter 严格单层：浮层外层只做暗化，
> 模糊只挂在面板上（blur 24px saturate 150%），禁止嵌套双层模糊。③ 光晕一律纯 `radial-gradient`，
> 不用 `filter: blur()`。④ `will-change` 只在动画/拖拽期间动态挂（如 `useDragSort` 的 styleFor），
> 静态元素常驻合成层会在低配 GPU 上掉帧。

> **实现注意（踩过的坑）**：滚动入场指令 `web/src/directives/intersect.ts` 用 `data-in-view`
> **属性**而非 class 做标记。若用 class，元素上 `:class` 绑定一旦更新（如进入编辑模式），
> Vue 会整体重写 `className`，指令追加的 class 被抹掉，`.reveal` 的 `opacity: 0` 会复现，
> 导致图标"隐形但可点击"。

## 5. 数据模型（D1）

```sql
-- 网址
CREATE TABLE links (
  id          TEXT PRIMARY KEY,          -- 16 位随机 ID
  title       TEXT NOT NULL,
  url         TEXT NOT NULL,
  icon        TEXT,                      -- 手动填入的图标 URL；为空则用名称首字占位
  folder_id   TEXT,                      -- 所属文件夹，NULL 表示在启动台顶层
  sort_order  INTEGER NOT NULL DEFAULT 0,
  is_pinned   INTEGER NOT NULL DEFAULT 0, -- 是否进入首页 7 个快捷位
  created_at  INTEGER NOT NULL,
  updated_at  INTEGER NOT NULL
);

-- 文件夹
CREATE TABLE folders (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  color       TEXT NOT NULL DEFAULT '#6366f1',
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  INTEGER NOT NULL
);

-- 站点设置（键值对：tagline / show_clock / wallpaper_url / restored_at）
CREATE TABLE settings (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- 登录失败限速
CREATE TABLE login_attempts (
  key           TEXT PRIMARY KEY,        -- login:<ip>
  fails         INTEGER NOT NULL DEFAULT 0,
  locked_until  INTEGER NOT NULL DEFAULT 0,
  last_attempt  INTEGER NOT NULL DEFAULT 0
);
```

首页快捷位 = `links` 中 `is_pinned = 1` 取 `sort_order` 前 7 条（应用层约束上限 7，`server/routes/links.ts` 的 `MAX_PINNED`）。

## 6. API 设计

| 方法   | 路径                            | 说明                                            | 鉴权       |
| ------ | ------------------------------- | ----------------------------------------------- | ---------- |
| GET    | `/api/bootstrap`                | 一次取回 links + folders + settings（公开部分） | 否         |
| POST   | `/api/auth/login`               | 密码换 token，写 HttpOnly Cookie                | 否（限速） |
| POST   | `/api/auth/logout`              | 清除会话                                        | 否         |
| GET    | `/api/auth/me`                  | 是否已登录                                      | 否         |
| POST   | `/api/links`                    | 新建网址                                        | 是         |
| PATCH  | `/api/links/:id`                | 修改网址                                        | 是         |
| DELETE | `/api/links/:id`                | 删除网址                                        | 是         |
| POST   | `/api/folders` · PATCH · DELETE | 文件夹增删改                                    | 是         |
| PATCH  | `/api/reorder`                  | 批量提交 links / folders 新顺序                 | 是         |
| GET    | `/api/backup`                   | 导出全站数据 JSON（含版本号）                   | 是         |
| POST   | `/api/backup/restore`           | 导入 JSON 恢复（整体覆盖 + 批量事务）           | 是         |
| POST   | `/api/settings`                 | 更新站点设置                                    | 是         |

**备份文件格式**（`GET /api/backup` 返回）：

```json
{
    "app": "atv-homepage",
    "version": 1,
    "exported_at": 1760000000000,
    "data": { "links": [], "folders": [], "settings": [] }
}
```

恢复时校验 `app` / `version`，在 D1 事务中清空旧数据后写入；校验失败返回 400 且不动现有数据。

## 7. 认证与安全

- 管理员密码不落库：部署时通过 `wrangler secret put ADMIN_PASSWORD` 注入；比对时双方做 SHA-256 摘要后常量时间比较，避免字符串比较的时序泄露。
- 登录成功签发 **HMAC-SHA256 签名 token**（含过期时间，默认 7 天），存 `HttpOnly; Secure; SameSite=Strict` Cookie；签名密钥取 `SESSION_SECRET`，缺省时由 `ADMIN_PASSWORD` 派生。
- 所有写操作校验 token；前端管理 UI 仅在登录后显示。
- 登录接口限速：基于 D1 计数 + `cf-connecting-ip`，连续 5 次失败锁 10 分钟。
- 响应统一安全头：`X-Frame-Options: DENY`、`X-Content-Type-Options: nosniff`、`Referrer-Policy: no-referrer`。
- URL 校验：仅允许 `http(s)://`，前端渲染用白名单属性，杜绝存储型 XSS。

## 8. 本地开发

```bash
pnpm install                                                   # 安装依赖
pnpm run db:init:local                                          # 首次：初始化本地 D1（表结构 + 默认数据）
pnpm preview                                                    # 终端 1：wrangler dev（http://127.0.0.1:8787，本地 D1 + 静态资源）
pnpm dev                                                        # 终端 2：Vite 开发服务器（http://localhost:5173，/api 代理到 8787）
pnpm run typecheck                                              # vue-tsc 类型检查
pnpm run build                                                  # 构建前端到 web/dist/
```

- 本地管理密码写在 `.dev.vars`（`ADMIN_PASSWORD=...`，可加 `SESSION_SECRET=...`），生产环境用 `wrangler secret put ADMIN_PASSWORD`
- 壁纸等设置、导入的网址都存在本地 D1（`.wrangler/`，已 gitignore），与线上互不影响
- 只跑 `pnpm preview` 也能看效果（服务的是 `web/dist`，改代码后需重新 `pnpm run build`）
- `wrangler dev` 8787 端口被占：上一个 dev 进程没退出，`pkill -f "workerd"` 后重启

### 开发命令速查

| 命令                    | 作用                                        |
| ----------------------- | ------------------------------------------- |
| `pnpm dev`              | Vite 开发服务器（/api 代理到 8787）         |
| `pnpm preview`          | wrangler dev（本地 Worker + D1 + 静态资源） |
| `pnpm run typecheck`    | vue-tsc 类型检查                            |
| `pnpm run build`        | 构建前端到 `web/dist/`                      |
| `pnpm run db:init`      | 初始化线上 D1 表结构                        |
| `pnpm run db:init:local` | 初始化本地 D1 表结构                       |
| `pnpm run deploy`       | 构建 + wrangler deploy                      |

## 9. 目录结构

```
atv-homepage/
├── README.md                   # 介绍 / 部署 / 使用（面向使用者）
├── AGENTS.md                   # 本文档（面向开发者 / AI Agent）
├── schema.sql                  # D1 建表语句
├── wrangler.jsonc              # Worker + Static Assets + D1 配置
├── .dev.vars                   # 本地开发的密码等环境变量（gitignore）
├── server/                     # Worker 后端（Hono）
│   ├── index.ts                # 入口：安全头 / 错误处理 / /api / 静态资源回落
│   ├── routes/
│   │   ├── auth.ts             # 登录 / 登出 / 会话校验
│   │   ├── links.ts            # 网址 CRUD（含快捷位配额）
│   │   ├── folders.ts          # 文件夹 CRUD
│   │   ├── reorder.ts          # 拖拽排序批量提交
│   │   ├── backup.ts           # 导出 / 校验 / 事务恢复
│   │   └── settings.ts         # 站点设置
│   ├── lib/
│   │   ├── auth.ts             # HMAC token / 密码比对 / 鉴权中间件（Web Crypto）
│   │   ├── validate.ts         # 请求体校验
│   │   └── ratelimit.ts        # 登录失败限速（D1）
│   └── types.ts
└── web/                        # Vue 3 前端
    ├── index.html
    ├── public/     default.jpg    # 默认壁纸（构建后发布到站点根路径）
    ├── vite.config.ts          # /api 代理到 wrangler dev
    └── src/
        ├── main.ts / App.vue / router/
        ├── views/      HomeView.vue（首屏 + 下滑进入的全屏启动台）
        ├── components/
        │   ├── cards/  LinkCard.vue · FolderCard.vue · FolderOverlay.vue
        │   ├── home/   HeroSection.vue
        │   ├── launchpad/ LaunchpadPanel.vue（启动台版式）· LaunchpadGrid.vue（拖拽排序 / 拖入文件夹）
        │   ├── admin/  AdminDrawer.vue（站点/备份抽屉）· EditorModal.vue（编辑弹窗）· LinkEditor.vue · FolderEditor.vue · BackupPanel.vue
        │   └── AppHeader.vue · ToastHost.vue · ConfirmDialog.vue
        ├── stores/     catalog.ts · auth.ts · ui.ts
        ├── composables/ useLenis.ts · useDragSort.ts   # 平滑滚动 + 指针拖拽排序
        ├── directives/ intersect.ts   # 滚动入场（data-in-view 属性标记）
        ├── api/        client.ts · types.ts
        ├── utils/      favicon.ts     # 图标地址 / 文字占位配色
        └── styles/     theme.css      # 设计变量 / 缓动 / 动画
```

## 10. 里程碑

1. **M1 骨架** ✅：Wrangler 项目 + D1 schema + Hono API（bootstrap / links CRUD）+ Vue 静态页跑通部署。
2. **M2 主页** ✅：Apple TV 风格首页（标语、7 快捷位、滚动提示、卡片动效）。
3. **M3 启动台** ✅：网格 + 文件夹浮层 + 下滑滚动联动动画。
4. **M4 管理** ✅：密码登录、网址 / 文件夹增删改、拖拽排序、快捷位配置。
5. **M5 备份恢复** ✅：导出 / 导入 JSON + 事务覆盖 + 校验。
6. **M6 打磨** ✅：登录限速、安全头、文字占位图标、移动端适配、`prefers-reduced-motion`。
