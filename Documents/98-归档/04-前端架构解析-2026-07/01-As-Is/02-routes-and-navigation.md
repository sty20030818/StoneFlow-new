# As-Is · 02 Routes & Navigation

> 状态：**W1 深挖完成**（2026-07-15）  
> 范围：`src/app/router.tsx`、`src/app/navigation/*`、`src/routes/**`、`src/routeTree.gen.ts`  
> 短契约对照：  
> - [`src/app/navigation/ARCHITECTURE.md`](../../../src/app/navigation/ARCHITECTURE.md)  
> - [`src/ARCHITECTURE.md`](../../../src/ARCHITECTURE.md) §5  
> 本分册是后续 Wave 的**颗粒度标尺**。

---

## 0. W1 结论速览

| 模块 | 评级 | Delete 分 | 建议动作 |
|------|------|-----------|----------|
| `app/router.tsx` | **Optimal** | 1 | Keep |
| `app/navigation/*`（整体） | **Acceptable** | 1 | Keep；小债见 §9 |
| `routes/**`（整体） | **Acceptable** | 叶子 4–5 / 骨架 1 | Keep |
| `routeTree.gen.ts` | n/a（生成物） | 1 | Keep · 禁止手改 |

**总体判断：** 昨天收口后的边界与短契约**基本一致**——`routes` 管 URL 入口，`navigation` 管产品语义，TanStack Router 是 URL/history 真相源。未发现 `tanstackCompat` / 第二套并行 history store。存在若干 **Acceptable 级** 债务（跨层 import、settings 不进 route memory、all/spaces 叶子重复、空目录），不阻塞 W2。

---

## 1. 设计意图 vs 代码事实

### 1.1 意图（已落地）

```txt
routes/          → file routes：匹配、loader、redirect、route layout、页面入口
app/router.tsx   → createRouter + createHashHistory + routeTree + Register 类型
app/navigation/  → 解析 / path / intents / 启动恢复 / session 最近浏览
app/layouts/     → 壳 UI；不读写 Tauri Store 导航记忆
features/*       → 页面组件；通过 intents/scope 导航，不管理 browser history
```

### 1.2 真相源矩阵（代码核对）

| 能力 | 真相源 | 证据 | 状态 |
|------|--------|------|------|
| 当前 URL | TanStack Router `location` | `useLocation` 于 layout / remember / sessionHistory | ✅ |
| 浏览器前进后退 | `router.history.go(±1)` | `sessionRouteHistory.ts` `goBack`/`goForward` | ✅ |
| 启动恢复 | Tauri Store `shell.navigation.restore` + `resolveStartupPath` | `routeMemoryStore.ts`；`routes/index.tsx` loader | ✅ |
| scope 上次位置 | 同 Store 的 `lastRouteByScopeKey` | `createNextShellRouteMemory` / `resolveRememberedPathForScope` | ✅ |
| 最近浏览 UI | 内存 `useState`（不持久化） | `sessionRouteHistory.ts` | ✅ |
| 业务数据 | Query（route loader 预取） | detail helpers + `index` spaces | ✅ |
| Shell UI 非 URL | Zustand 等（不在本模块） | 短契约 | ✅ 本层未镜像 URL |

### 1.3 启动与记忆时序

**启动恢复**

```txt
App → QueryClientProvider → RouterProvider(context.queryClient)
  → 命中 path `/`
  → routes/index loader:
       ensureQueryData(spaceKeys.visible)
       → resolveStartupPath({ spaces })  // 读 Store + routeMemory 纯规则
       → throw redirect({ to, replace: true })
  → pending:「正在恢复上次工作区...」
```

**写入记忆（按 scope layout）**

```txt
/_shell/all 或 /_shell/spaces/$spaceId  layout 渲染
  → useRememberCurrentShellRoute(scope)
  → location 变化 effect
  → rememberShellRoute(scope, fullPath)
  → createNextShellRouteMemory（不可记忆则 no-op）
  → LazyStore set + save
```

**Header back / forward**

```txt
ShellLayout 装配 useShellSessionRouteHistory
  → 跟踪 rememberable 的 entry
  → goBack/goForward → router.history.go
  → 下拉列表 navigate({ to: entry.path })
```

---

## 2. FE-APP-ROUTER · `src/app/router.tsx`

### A. 身份卡

| 字段 | 内容 |
|------|------|
| 路径 | `src/app/router.tsx` |
| 层级 | app |
| 一句话职责 | 创建全局 TanStack Router 实例并注册类型 |
| 不负责 | path 语义、恢复规则、页面 UI、Query 默认策略 |
| 文件规模 | 1 file · 27 LOC |
| 公开 API | `router`、`AppRouterContext` |
| 私有面 | 无 |

### B. 结构 / 配置表

| 配置项 | 值 | 含义 |
|--------|-----|------|
| `routeTree` | `@/routeTree.gen` | 生成路由树 |
| `history` | `createHashHistory()` | Hash 路由（适合 Tauri 桌面） |
| `context` | `{ queryClient }`（实例化时 placeholder，运行时由 Provider 注入） | loader 可取 QueryClient |
| `defaultPreload` | `'intent'` | 悬停/意图预加载 |
| `defaultPreloadStaleTime` | `0` | |
| `scrollRestoration` | `true` | |
| `defaultStructuralSharing` | `true` | |
| 模块增强 | `Register.router` | 类型安全 navigate/Link |

### C–F 摘要

| 项 | 结论 |
|----|------|
| 上游 | `@tanstack/react-router`、`routeTree.gen` |
| 下游 | `App.tsx` → `RouterProvider`；`__root` 用 `AppRouterContext` |
| Delete 分 | **1**（应用无法启动） |
| 评级 | **Optimal** |
| 质量 | 无 barrel；官方 API；无第二 history |

### 装配

```txt
App.tsx
  QueryClientProvider
  AppProviders
  RouterProvider router={router} context={{ queryClient }}
```

---

## 3. FE-APP-NAV · `src/app/navigation/*`

### 3.1 目录与文件级职责

```txt
src/app/navigation/
  ARCHITECTURE.md
  shellRoute.ts                 (+ shellRoute.settings.test.ts)
  scope.ts
  routePaths.ts                 (+ routePaths.test.ts)
  intents.ts
  routeMemory.ts                (+ routeMemory.test.ts)
  routeMemoryStore.ts           (+ routeMemoryStore.test.ts)
  useRememberCurrentShellRoute.ts
  sessionRouteHistory.ts        (+ sessionRouteHistory.test.tsx)
```

无 `index.ts` barrel。✅

| 文件 | 职责 | 副作用 | 测试 | 关键导出 |
|------|------|--------|------|----------|
| `shellRoute.ts` | URL → `AppRoute` / `ShellRoute` 产品语义；scope/section/settings 标志 | 无 | settings 相关 | `parseShellRoute`、`parseAppRoute`、`resolveShellSection`、`ShellRoute` 类型… |
| `scope.ts` | `ShellRoute` → `Scope`（detail 用 spaceId 回填） | 无 | 无独立测 | `resolveShellRouteScope` |
| `routePaths.ts` | canonical path **纯拼接** | 无 | 有 | `buildCanonical*`、`buildTaskDetailPath`、`buildScopedSettingsPath`、`buildStartupFallbackPath`… |
| `intents.ts` | 业务意图 → path（可带 session 上次 settings） | 读 `readLastSettingsSection`（session） | 无 | `openSection`、`openSettings`、`openView`、`openTaskDetail`、`openProjectDetail`、`openShellNavigationTarget`… |
| `routeMemory.ts` | 记忆 normalize/validate/启动与 scope 解析 **纯规则**；校验 task/project 时 **async IPC via feature api** | 调用 `getTaskDetail` / `getProjectDetail` | 有 | `resolveStartupPathFromMemory`、`isRememberableShellPath`、`createNextShellRouteMemory`… |
| `routeMemoryStore.ts` | Tauri `LazyStore` 边界 | 读/写磁盘 | 有 | `loadShellNavigationRestore`、`rememberShellRoute`、`resolveStartupPath`、`resolveRememberedPathForScope` |
| `useRememberCurrentShellRoute.ts` | route layout hook → 写记忆 | effect + store | 无 | 同名 hook |
| `sessionRouteHistory.ts` | 会话最近浏览 + back/forward 可用性 | 内存 state；`history.go` | 有 | `useShellSessionRouteHistory`、`ShellRouteHistoryEntry` |

### 3.2 Store 契约

| 项 | 值 |
|----|-----|
| 文件 | `shell-device-preferences.json`（与 shell 设备偏好共用文件，避免迁移） |
| key | `shell.navigation.restore` |
| 结构 `ShellRouteMemory` | `{ version: 2, lastScopeKey, lastRouteByScopeKey }` |
| scope key | `'all'` \| `` `space:${id}` `` |

### 3.3 可记忆路径规则（重要）

`isRememberableShellPath` **允许**：

- `/all/{inbox|tasks|views|projects|no-project|archive|trash}`
- `/spaces/:id/{同上 section}`
- view / task / project **详情** path

**不允许**（因此不会写入记忆）：

- `/`、`/launcher`
- **`/…/settings` 与 `/…/settings/:section`**（`ALLOWED_SECTION_SEGMENTS` 无 `settings`）
- 非法/unknown path

→ 从设置页离开再切回 scope 时，恢复的是**进入设置前的 work path**，不是设置本身。属产品选择还是遗漏：**待产品确认**（记入风险，非 Critical）。

### 3.4 `AppRoute` / `ShellRoute` 语义

| `AppRoute.kind` | 典型 path | 备注 |
|-----------------|-----------|------|
| `startup` | `/` | 仅启动跳板 |
| `launcher` | `/launcher` | 独立窗 |
| `debug-activity` | `/debug/activity` | |
| `shell-section` | `/all/inbox`、`/spaces/:id/settings/...` 等 | section 含 settings |
| `view` | `…/views/:viewId` | |
| `task` | `/spaces/:spaceId/tasks/:taskId` | **仅 space 前缀** |
| `project` | `/spaces/:spaceId/projects/:projectId` | **仅 space 前缀** |
| `unknown` | 其余（含 bare `/all` 无 section） | |

`ShellRoute` 在 `AppRoute` 上展开：`section`、`settingsSection`、`isWorkPath`、`isSettingsPath` 等，供 layouts/breadcrumb 消费。

### 3.5 Path builder 默认

| 场景 | 默认 |
|------|------|
| all 启动/fallback | `/all/tasks` |
| space 启动/fallback | `/spaces/:id/inbox` |
| settings 全局入口 | all scope + `DEFAULT_SETTINGS_SECTION` |
| project 无 id | 退回 projects section path |
| all scope 下 project detail path | 仍生成 `/spaces/:spaceId/projects/:id`（必须有 spaceId） |

### 3.6 依赖卡（navigation 整体）

**上游（navigation import 谁）**

| 目标 | 文件 | 类型 | 说明 |
|------|------|------|------|
| `@tanstack/react-router` | sessionHistory, useRemember | 框架 | |
| `@tauri-apps/plugin-store` | routeMemoryStore | 平台 | |
| `@/shared/types` | 多处 | 类型 | Scope, Space… |
| `@/features/settings/...` | shellRoute, routePaths, intents | **feature** | SettingsSectionKey、last section |
| `@/features/command` | intents | **类型** | `ShellNavigationTarget` |
| `@/features/task/api` | routeMemory | **feature api** | 校验记忆中的 task |
| `@/features/project/api` | routeMemory | **feature api** | 校验记忆中的 project |
| `@/app/layouts/shell/config` | sessionRouteHistory | **layouts** | 标签/图标文案、`ShellProjectLink` |

**下游（谁 import navigation）** — 抽样已扫全 `src`：

| 消费者类 | 代表路径 | 用什么 |
|----------|----------|--------|
| routes | `index`、`_shell/all|spaces route`、detail-helpers、scoped layout | store / remember / parse / intents |
| app/layouts | ShellLayout, Sidebar, Header, config, settingsNav, taskOpenStrategy, ShellRouteContext… | intents, parse, sessionHistory, store |
| features | entity-detail, global-search, views, inbox, project*, lifecycle, all-tasks, task detail… | intents / scope |
| shared/ui | breadcrumbResolver | ShellRoute 类型 + intents + scope |

**耦合类型：** 类型 + 纯函数 + hook + store I/O +（routeMemory）IPC 校验  

**Delete Test：** 删除整个 `navigation/` → 启动恢复、侧栏跳转、breadcrumb、命令导航、详情 open 策略、session history **全部失败**。Delete 分 **1**。

### 3.7 质量卡（navigation）

| 检查项 | 结果 | 证据 |
|--------|------|------|
| 依赖方向 app→features→shared | **Partial** | navigation→features（settings/task/project/command）；navigation→layouts（config 标签） |
| 无裸 invoke | **Pass** | 经 feature api facade |
| 无 Query 双写 store | **Pass** | Store 只存 path 记忆 |
| 无 barrel | **Pass** | 无 index.ts |
| 导航无第二 DSL 接管 URL | **Pass** | 解析层是产品语义，不替代 Router |
| URL 不镜像 Zustand | **Pass** | |
| Tauri Store 不参与 back/forward | **Pass** | 仅 restore |
| 纯规则有单测 | **Pass** | routeMemory / routePaths / shellRoute.settings / store / sessionHistory |
| Provider composition | **N/A** | 无大型 provider |

### 3.8 结论卡（navigation）

- **评级：Acceptable**（边界清晰；跨层依赖是主要扣分）
- **Top 风险：**
  1. `sessionRouteHistory` → `layouts/shell/config`：导航语义依赖壳配置（标签/项目链接类型），长期应考虑把「展示元数据」下沉 shared 或反向由 layout 注入。
  2. `routeMemory` → task/project **api**：纯规则层夹带实体存在性校验 IPC，测试与运行都绑领域。
  3. settings **不进** rememberable：scope 切换/启动不会回到设置页。
- **不改的理由（KISS）：** 当前行为稳定、测试覆盖好；为「完美分层」大拆收益低。
- **建议动作：Keep**；Gap 阶段再评是否抽 `getSectionLabel` / 校验端口。
- **To-Be 候选一句话：** navigation 保持「语义+恢复」；展示文案与实体校验通过端口注入，避免 navigation→layouts / 硬依赖 domain api。

---

## 4. FE-ROUTE-* · `src/routes/**`

### 4.1 树与职责边界

```txt
src/routes/
  __root.tsx
  index.tsx                         # /
  launcher.tsx
  settings.tsx                      # legacy /settings
  debug.activity.tsx
  -router-feedback.tsx              # 私有 UI
  -activity-debug-route.tsx         # 私有
  -activity-debug-search.ts         # 私有 search 契约
  _shell/
    route.tsx                       # pathless 组
    -scoped-shell-route-layout.tsx
    -detail-route-helpers.tsx (+test)
    all/…
    spaces/$spaceId/…
  debug/                            # 空目录 ⚠️
  spaces/                           # 空目录 ⚠️
```

**允许（与短契约一致）：** 匹配、loader、redirect、error/notFound、薄 layout、挂页面组件、调用 `useRememberCurrentShellRoute`。  

**未发现：** route 内维护最近浏览、route 直接读写 Tauri Store（store 只在 navigation + index loader 经 facade）、route 内大块业务 UI（debug 装配除外）。

### 4.2 根级 route 加表

| 文件 | URL path | layout 链 | loader | redirect | pending/error | 页面来源 | memory |
|------|----------|-----------|--------|----------|---------------|----------|--------|
| `__root.tsx` | （root） | — | 无 | 无 | error/notFound → RouterFeedback | Outlet only | 无 |
| `index.tsx` | `/` | root | spaces + `resolveStartupPath` | **replace → 恢复 path** | pending/error 文案 | 无页面 | 读 store |
| `launcher.tsx` | `/launcher` | root | 无 | 无 | 默认 | `features/launcher/ui/QuickCreatePage` | 不记忆 |
| `settings.tsx` | `/settings` | root | 无 | Navigate → `/all/settings/$section`（last section） | — | 无 | — |
| `debug.activity.tsx` | `/debug/activity` | root | 无 | 无 | validateSearch | `-activity-debug-route` → feature UI | 不记忆 |

### 4.3 私有 helper 文件

| 文件 | 职责 | 依赖 |
|------|------|------|
| `-router-feedback.tsx` | 全屏反馈页（title/description/action） | 无业务 |
| `-activity-debug-search.ts` | debug search 规范化（entityType/id/limit） | activity 类型 |
| `-activity-debug-route.tsx` | debug 页装配：search、fetch、表单 | activity api/ui |
| `_shell/-scoped-shell-route-layout.tsx` | `parseShellRoute` + `ShellRouteLayout` + Outlet | navigation + layouts |
| `_shell/-detail-route-helpers.tsx` | spaces 预取、task/project ensure、space 不一致 redirect、错误态 UI | intents, space/project/task query+api, TaskPageState |

### 4.4 `_shell` 组

| 文件 | path id | 职责 |
|------|---------|------|
| `_shell/route.tsx` | `/_shell`（pathless） | Outlet；组级 error/notFound → 回 `/all/tasks` |

Layout 真正壳在 **scope 子 layout**（all / spaces/$spaceId），不是 `_shell/route` 本身。

### 4.5 Scope layout

| 文件 | path | scope | remember | 子 layout |
|------|------|-------|----------|-----------|
| `all/route.tsx` | `/_shell/all` → `/all/*` | `{ type:'all' }` | ✅ hook | ScopedShellRouteLayout |
| `spaces/$spaceId/route.tsx` | `/_shell/spaces/$spaceId` | `{ type:'space', spaceId }` | ✅ hook | 同上 |

### 4.6 叶子 route 全表（all 与 spaces 对称）

| 逻辑页 | all 文件 | URL（all） | spaces 文件 | URL（space） | 页面组件 | loader | 特殊 |
|--------|----------|------------|-------------|--------------|----------|--------|------|
| index | `all/index.tsx` | `/all/` → | `spaces/.../index.tsx` | `/spaces/:id/` → | Navigate | 无 | all→`/all/tasks`；space→`…/inbox` |
| inbox | `all/inbox.tsx` | `/all/inbox` | 对称 | `/spaces/:id/inbox` | `InboxPage` | 无 | |
| archive | `all/archive.tsx` | `/all/archive` | 对称 | … | `ArchivePage` | 无 | |
| trash | `all/trash.tsx` | `/all/trash` | 对称 | … | `TrashPage` | 无 | |
| no-project | `all/no-project.tsx` | `/all/no-project` | 对称 | … | `NoProjectPage` | 无 | |
| tasks layout | `all/tasks/route.tsx` | `/all/tasks` | 对称 | … | Outlet | 无 | |
| tasks index | `all/tasks/index.tsx` | `/all/tasks/` | 对称 | … | **`AllTasksPage`**（两边同页） | 无 | |
| **task detail** | ❌ 无 | — | `tasks/$taskId.tsx` | `/spaces/:id/tasks/:taskId` | `TaskPage` | ensure task+space | space 不一致 redirect |
| projects layout | `projects/route.tsx` | Outlet | 对称 | | Outlet | 无 | |
| projects index | `projects/index.tsx` | `/all/projects/` | 对称 | | `ProjectOverviewPage` | 无 | |
| project detail | `projects/$projectId.tsx` | `/all/projects/:projectId` | `…/$projectId.tsx` | `/spaces/:id/projects/:id` | `ProjectPage` | ensure project | **all 侧 `routeSpaceId: ''`** → 总是按实体 space 校正/redirect 到 `/spaces/...` |
| views layout | `views/route.tsx` | Outlet | 对称 | | Outlet | 无 | |
| views index | `views/index.tsx` | `/all/views/` | 对称 | | `ViewsPage` | 无 | |
| view detail | `views/$viewId.tsx` | `/all/views/:viewId` | 对称 | | `ViewsPage` | 无 | |
| settings layout | `settings/route.tsx` | Outlet | 对称 | | Outlet | 无 | |
| settings index | `settings/index.tsx` | `/all/settings/` | 对称 | | Navigate → last section | 无 | |
| settings section | `settings/$section.tsx` | `/all/settings/:section` | 对称 | | `SettingsPage`；非法 section → default | 无 | 运行时校验 `isSettingsSectionKey` |

### 4.7 all vs spaces 不对称点（必记）

| 点 | all | spaces |
|----|-----|--------|
| 默认 index | `/all/tasks` | `/spaces/:id/inbox` |
| Task 详情路由 | **无** | **有** `$taskId` |
| Project 详情 | 有，但 loader `routeSpaceId: ''` 强制对齐真实 space | 有，校验 `params.spaceId` |
| 列表页组件 | 与 space **共用** 同一 feature 页面 | 同左 |

### 4.8 `routeTree.gen.ts`

| 项 | 内容 |
|----|------|
| 生成 | `@tanstack/router-plugin` |
| 消费 | 仅 `app/router.tsx` |
| 规则 | **禁止手改**；改 file routes 后由构建生成 |

### 4.9 空目录

| 路径 | 状态 | 建议 |
|------|------|------|
| `src/routes/debug/` | 空（实际 route 是 `debug.activity.tsx`） | Migrate 波次 0 删除 |
| `src/routes/spaces/` | 空（实际在 `_shell/spaces`） | 同上 |

### 4.10 routes 依赖与 Delete

**上游：** navigation、layouts（ShellRouteLayout）、大量 features 页面、shared button、query keys  

**下游：** 仅 router 经 routeTree；无 feature 反向 import route file（debug 用 getRouteApi 在 route 私有组件内）✅  

| 删除对象 | 影响 | Delete 分 |
|----------|------|-----------|
| 单个 scene 叶子（如 inbox.tsx） | 该 URL 404；feature 仍在 | **4–5** |
| `_shell` 整树 | 主应用不可用 | **1** |
| `index.tsx` 启动 | 无恢复入口 | **2**（可另做默认 redirect） |
| detail-helpers | task/project 详情 loader 崩 | **2** |

### 4.11 routes 质量卡

| 检查项 | 结果 | 证据 |
|--------|------|------|
| 薄入口、无大块业务 UI | **Pass**（debug 装配可接受） | 叶子多 5–15 行 |
| loader 合理预取 | **Pass** | startup spaces；detail ensure |
| 无 store 导航容器 | **Pass** | |
| DRY all/spaces | **Partial** | 对称叶子几乎复制（file-routing 代价） |
| 官方 file route | **Pass** | createFileRoute / pathless `_shell` |
| 非法 settings | **Pass** | Navigate 到 default section |

### 4.12 routes 结论

- **评级：Acceptable**
- **风险：** 叶子重复；空目录；all 区 project detail 用空 `routeSpaceId` 需读者理解；无 all-scope task URL（与 shellRoute 一致，产品如此）
- **建议：Keep**；Migrate 删空目录；To-Be 可评估 codegen/共享 route factory（非必须）

---

## 5. 端到端：导航意图如何落地

```txt
用户/命令/侧栏
  → openSection / openTaskDetail / openSettings … (intents)
  → 得到 canonical string path
  → navigate({ to }) / <Link to> / redirect({ to })
  → TanStack 匹配 file route
  → scope layout remember
  → feature Page 渲染
```

业务侧**应**走 intents/routePaths；route 文件内允许官方 `to: '/all/tasks'` 等字面量（错误回退、组 notFound）。  
W1 未做全仓「手拼 path」审计（留给 W7/Gap）；layouts/features 已广泛 import intents。

---

## 6. 新增 route 检查清单（执行用）

改完必须同时：

- [ ] 新增 `src/routes/...` file route
- [ ] `shellRoute.ts` 能 parse（或明确 unknown）
- [ ] `routePaths.ts` / `intents.ts` 能生成
- [ ] `isRememberableShellPath` 是否应记忆（settings 当前否）
- [ ] `sessionRouteHistory` 标签/图标是否合理
- [ ] 若 detail：是否走 `-detail-route-helpers`
- [ ] 更新本表 + 短契约（若边界变）
- [ ] `bun run typecheck && bun run test:run src/app/navigation`

禁止复活：`app/routing`、`navigation-runtime`、`tanstackCompat`、全局 `navigationStore`。

---

## 7. 子系统六卡汇总（压缩）

### FE-APP-ROUTER

见 §2。Optimal / Delete 1 / Keep。

### FE-APP-NAV

见 §3。Acceptable / Delete 1 / Keep。

### FE-ROUTE-ROOT 组（__root, index, qc, settings legacy, debug）

| ID | 评级 | Delete | 动作 |
|----|------|--------|------|
| FE-ROUTE-ROOT | Optimal | 1 | Keep |
| FE-ROUTE-INDEX | Optimal | 2 | Keep |
| FE-ROUTE-QC | Optimal | 4（仅 QC 窗） | Keep |
| FE-ROUTE-SETTINGS-LEGACY | Acceptable | 5 | Keep（兼容） |
| FE-ROUTE-DEBUG-ACTIVITY | Acceptable | 5 | Keep |

### FE-ROUTE-SHELL

Acceptable / 骨架 Delete 1 / 叶子随 scene 4–5 / Keep。

### FE-ENTRY-ROUTETREE

生成物 / Delete 1 / 禁止手改。

---

## 8. 与「可删除性」理想（决策 2=A）的关系

| 删除目标 | 是否接近「装配+route」 |
|----------|------------------------|
| 某个 scene 页面 feature | route 叶子删/改 + 侧栏入口；**navigation 表通常不用删** | 接近 |
| 整个 navigation | **否** — 真平台，Delete 1 | true-platform |
| task 详情能力 | 删 `tasks/$taskId` + helpers 引用 + intents 调用方 | 中等 |
| settings | 多处 route + intents + shellRoute section 识别 | 中等 |

W1 结论：navigation/router 是**平台内核**，不追求可删；**可删性压力在 scene feature + 对应叶子 route 对称删除**。

---

## 9. 已知债务清单（进入 Gap 候选，本阶段不改代码）

| ID | 项 | 严重度 | 说明 |
|----|-----|--------|------|
| NAV-D1 | navigation → layouts/config | med | session 历史标签耦合壳配置 |
| NAV-D2 | routeMemory → task/project api | med | 纯规则层依赖领域 IPC |
| NAV-D3 | settings 不可记忆 | low/med | 产品或疏漏待确认 |
| NAV-D4 | navigation → features/settings、command 类型 | low | 可接受的轻依赖 |
| RTE-D1 | all/spaces 叶子重复 | low | file-routing 成本 |
| RTE-D2 | 空目录 `routes/debug`、`routes/spaces` | low | 可删 |
| RTE-D3 | all project detail `routeSpaceId: ''` | low | 需文档化；行为正确但隐晦 |
| RTE-D4 | detail error UI 依赖 `TaskPageState` | low | helpers 略沾 feature UI |

**无 Critical。** 无 DOC-DRIFT 新增（T1 路由漂移已在附录 DRIFT-001）。

---

## 10. W1 未覆盖（有意留给后续）

- 全仓手拼 path 静态审计 → W7 / Gap  
- ShellLayout 如何消费 sessionHistory 的 UI 细节 → **W2**  
- feature 页面内部如何用 scope → W3–W5  
- IPC 命令全表 → W8  

---

## 11. 验证建议（改本域时）

```bash
bun run typecheck
bun run lint
bun run test:run src/app/navigation
bun run test:run src/routes
# 或
rg "@/app/(routing|navigation-runtime)|tanstackCompat" src
```

---

## 12. Session 收口

- W1 深描完成，本文件可作为 **As-Is 标尺**  
- 注册表 / README Wave / Session 日志同步更新  
- **下一 Wave：W2** `app/providers` + `app/layouts` + 入口装配  
