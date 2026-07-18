> 版本：v4.1
> 作用：定义 `src/` 前端架构边界（**现网事实**；重构进度见 Docs 执行计划）
> 最后更新：2026-07-17
>
> ### 必读文档
>
> | 文档 | 用途 |
> |------|------|
> | [`05-模块设计规范.md`](../Docs/03-前端架构解析/05-模块治理/05-模块设计规范.md) | 纯化 / 类型 / 协作端口 / 检查表 |
> | [`09-决议总表.md`](../Docs/03-前端架构解析/05-模块治理/09-决议总表.md) | 目标决议一览 |
> | [`10-T2重构执行计划.md`](../Docs/03-前端架构解析/05-模块治理/10-T2重构执行计划.md) | **重构刀序与进度**（过程标签只写这里） |
> | [`04-长期目标-装配三角.md`](../Docs/03-前端架构解析/05-模块治理/04-长期目标-装配三角.md) | 长期蓝图 |
> | [`07-Feature切分与边界总览.md`](../Docs/03-前端架构解析/05-模块治理/07-Feature切分与边界总览.md) | 并/拆/Keep |
> | [`08-Feature品质验收标准.md`](../Docs/03-前端架构解析/03-To-Be/08-Feature品质验收标准.md) | P0 品质勾选 |
>
> **冲突时：** 决议总表 + 设计规范 > 本文「现网」段 > 过时 As-Is。
> **改模块时：** 同步该模块 `ARCHITECTURE.md`（无则新建短契约）。
> **源码注释：** 写职责与边界原因，禁止写史诗号/目标码/Phase（见 `CONVENTIONS.md`）。

---

## 1. 文档定位

本文描述 **今天代码真实分层**（日常开发对照）。
重构过程进度只维护在 `Docs/.../10-T2重构执行计划.md`，不在源码注释里堆过程标签。

不负责：逐步 diff 流水账、页面交互文案、Rust crate 细账。

---

## 1.1 目标心智与横切规则

```txt
目标方向（部分已落地）：
- navigation：path 方言 + memory；业务 open 策略在 domain
- routes：单工作区树 + scope context；薄页
- layout：铬架 + Host 装配；无 domain 业务 command 表
- command：元数据在 command；handlers 由各 domain register
- bulk：纯引擎；actions/adapters 在各 domain
- 禁止：features/** import @/layout/**
```

横切硬规则：

1. `features/*` **不得** `import '@/layout/**'`。
2. 跨 feature 仅 `@/features/<name>` 或 `/contract` `/page`。
3. 换页经 `app/navigation` intent/path；打开策略在 domain public。
4. selection ≠ bulk ≠ command；filter ≠ display-options。

---

## 2. 当前真实心智

```txt
启动接线在 app · 铬架在 layout · URL 薄页在 routes ·
能力在 features（model/api/hooks/components + public）·
纯零件在 shared · 样式在 styles
```

```txt
TanStack Router (hash + file routes)
  → routes/_shell 挂 layout 铬架
  → features/* 业务能力 / 数据接线
  → shared/* 跨业务 UI · query 工具 · lib
  → styles/*
  → Tauri IPC 经 feature api facade
```

状态边界：

```txt
TanStack Query          → 服务端 / 可回源数据
Zustand + React state
  + useSyncExternalStore → 客户端 UI 瞬时态
```

若把服务器状态塞回 store、组件散落裸 `invoke()`、`shared` 反向依赖业务、或跨 feature 深路径 import，视为架构退化。

---

## 3. 当前目录结构

```txt
src/
├── main.tsx
├── app/                         # 组合根：Providers、router 装配、导航语义
│   ├── App.tsx
│   ├── router.tsx
│   ├── providers/
│   └── navigation/              # path 语义 · intent · route memory（非视觉）
├── layout/                      # 产品铬架：侧栏/顶栏/主区/overlay/command-bridge
├── routes/                      # TanStack file routes + 薄页
│   ├── __root.tsx
│   ├── index.tsx / launcher.tsx / settings.tsx / debug.activity.tsx
│   └── _shell/
│       ├── route.tsx
│       ├── all/…
│       └── spaces/$spaceId/…
├── features/                    # 业务垂直切片（见 §4.3）
├── shared/                      # 无业务归属的共享层
│   ├── components/              # base · board · row · main-card · patterns…
│   ├── hooks/ · lib/ · query/ · types/ · events/ · form/ …
├── styles/
├── test/
├── ARCHITECTURE.md
└── CONVENTIONS.md
```

**已删除 / 勿再写为现状：** 顶层 `pages/`、`app/layouts`（已迁 `layout/`）、`shared/ui`（已迁 `shared/components`）、独立 feature 壳 `inbox` / `all-tasks` / `archive` / `trash` / `no-project` / `views`（列表场景走路由薄页 + domain feature）、`healthcheck` / `task-drawer` 等旧目录。

---

## 4. 分层与职责

### 4.1 `app/`：组合根

**负责：**

1. 入口装配、`RouterProvider` / 全局 Provider 树（QueryClient 默认选项等）；
2. `app/navigation/*`：shell route 语义、scope、canonical path、intent、启动恢复、会话历史；
3. `app/router.tsx`：TanStack Router 实例。

**不负责：** 侧栏/顶栏视觉、实体规则、list-scene、board 实现。

### 4.2 `layout/`：产品铬架

**负责：**

1. `ShellRouteLayout` / `AppLayout` / Chrome（Header · Sidebar · Main · Footer · Drawer）；
2. 壳级 Provider 嵌套、CommandBridge 装配、Overlays 挂载；
3. `ShellBulkActionBoundary`：**只 compose** 各域 bulk public（不写动作/adapter 实现）。

**不负责：** 实体 Query 真相、task/project 业务规则、EntityScene 实现（→ `features/entity-scene`）、写路径记忆（scope route + `app/navigation`）。

短契约细节：[`layout/ARCHITECTURE.md`](./layout/ARCHITECTURE.md)。

### 4.3 `routes/`：薄页

**负责：** URL 匹配、loader/redirect、把 params/search 交给 feature 出口。

**不负责：** 厚业务组件、裸 `invoke()`。

正式工作路径：`/all/*`、`/spaces/:spaceId/*`（以及 `/launcher`、`/debug/activity` 等）。

### 4.4 `features/`：业务能力

每个 feature 是可删的垂直切片。推荐内部分层（可按需省略空夹）：

| 目录 | 职责 |
|------|------|
| `model/` | 类型、纯规则、ports |
| `api/` | 仅 IO：invoke / Store / listen |
| `hooks/` | Query / Mutation / list-scene facade |
| `components/` | 业务 UI |
| `index.ts` | **默认 public**（跨模块只应从这里 import） |
| `contract.ts` | 可选极窄契约（如 settings） |
| `page.ts` | 可选页面出口（供 routes） |

**Feature 内依赖：** `components → hooks → api → model`；可依赖 `shared`；跨 feature **只走 public**（`. | contract | page`）。

**禁止：** `@/features/<name>/api|hooks|model|components|…` 深路径跨 feature import。
校验：`bun run scripts/check-feature-boundaries.mjs`（含于 `bun run check`）。

当前 feature 目录名：`activity` · `bulk-action` · `command` · `danger-confirm` · `display-options` · `entity-detail` · `entity-scene` · `filter` · `global-search` · `launcher` · `lifecycle` · `metadata-fields` · `project` · `project-overview` · `selection` · `settings` · `shell-dialogs` · `space` · `submit` · `sync` · `task` · `update` · `view` · `workspace`。

列表类 URL（inbox / tasks / archive / trash / no-project 等）**不再各自成 feature**；薄页 + `task`（等）list-scene facade（如 `useTaskListScene`）。

**已有模块 ARCHITECTURE：**
`bulk-action` · `command` · `launcher` · `task` · `project` · `lifecycle` · `settings` · `shell-dialogs` · `entity-scene` · `filter` · `selection` · `submit` · `space` · `metadata-fields` · 以及 `layout/` · `app/navigation/` · 本文。其余 feature 在动刀时补短契约。

### 4.5 `shared/`：共享基础设施

只放跨 feature 真正共用、**不携带产品业务归属**的内容：

- `shared/components/*`：shadcn/base、board/row、main-card、patterns…
- `shared/query`：跨 feature invalidation 等
- `shared/events` · `lib` · `types` · `form` · `config` · `autosave` · `validation` …

禁止：task/project/space 专属规则、feature 专属 API、单页专用组合逻辑、`shared` 依赖 `features` / `layout` / `app` 业务语义。

### 4.6 `styles/`

全局视觉真相源：token、shadcn 映射、Tailwind v4 入口、reset / utility。见 `styles/ARCHITECTURE.md`。

---

## 5. 路由与导航

```txt
@tanstack/react-router
  + createHashHistory
  + file routes (src/routes) → routeTree.gen.ts
```

壳内装配链：

```txt
routes/_shell/{all|spaces}/route
  → useRememberCurrentShellRoute(scope)     # app/navigation
  → ScopedShellRouteLayout
       → ShellRouteLayout
            → workspace sync · nav store 衍生 · Shell chrome
            → <Outlet /> 薄页 → feature page / scene
```

三层真相：

1. `src/routes/**`：file tree、loader、redirect；
2. `app/navigation/*`：结构化 shell route、path builder、intent、memory；
3. `app/router.tsx`：Router 实例。

不保留 react-router / 兼容 DSL 第二套。导航文件边界见 `CONVENTIONS.md` 与 `app/navigation/ARCHITECTURE.md`。

---

## 6. 数据与状态边界

### 6.1 服务器状态

统一 TanStack Query。落点：

```txt
features/{feature}/api    → Tauri invoke facade
features/{feature}/hooks  → keys / queries / mutations / useXxx
features/{feature}/model  → 纯规则 · 客户端局部模型
shared/query              → 跨 feature 失效等
```

已落地领域示例：`space` · `project` · `task` · `lifecycle` · `view` · `activity` · `search` · `settings`（含设备偏好）· badges 等。

QueryClient 默认（`app/providers`）：`staleTime 30s` · `gcTime 10min` · `refetchOnWindowFocus: false` · query `retry: 1` · mutation `retry: 0`。

### 6.2 客户端状态

- Zustand：壳 nav 衍生、dialog、sidebar settings、search focus intent 等
- React state：页局部
- `useSyncExternalStore`：如 SubmitRegistry
- reducer/provider：如 Launcher session

禁止用 store 复制 Query 中已有的服务器数据。

### 6.3 工作区刷新

`features/workspace`：听事件 → debounce → `invalidateWorkspaceQueries`。薄同步边界，不是统一 API 工厂。

---

## 7. 关键跨层边界（摘要）

| Feature | 角色 |
|---------|------|
| `submit` | 壳级提交目标注册表（非表单库 / 非 mutation 层） |
| `selection` | 实体多选与 CommandSelection（非 bulk 实现本身） |
| `command` | registry / keybinding / menu / shortcut runtime |
| `bulk-action` | bulk contract · registry · adapter · UI |
| `launcher` | 独立窗口：session / domain / chrome / composer / create / results |
| `entity-detail` | 抽屉打开真相 = **URL search**，非全局 drawer store |
| `settings` | 设置页 + `contract` / `page` 三入口约定 |

feature 级细文：`features/{command,bulk-action,launcher}/ARCHITECTURE.md` 等。

---

## 8. 依赖方向

```txt
app      → features(public) · layout · shared · styles · routes 装配
layout   → features(public) · shared · styles · app/navigation（语义）
routes   → layout · features(public|page) · app/navigation
features → shared · styles · 其它 feature 的 public 仅
shared   → styles（及同层工具）；❌ features / layout / app 业务
styles   → 不依赖业务层
```

**禁止：**

1. `shared` → `features` / `layout`
2. 跨 feature 深路径 import
3. 组件裸 `invoke()`
4. store 复制 Query 服务器数据
5. 某 feature 私有状态冒充全局真相

---

## 9. 新代码落点

| 问题 | 落点 |
|------|------|
| 启动、全局 Provider、导航语义 | `app/` |
| 壳 UI、CommandBridge、EntityScene | `layout/` |
| URL / 薄页 | `routes/` |
| 业务能力 / 查询 / 业务 UI | `features/{name}/` |
| 无归属通用 UI / 工具 | `shared/` |
| token / 全局样式 | `styles/` |

只被一个 feature 用一次的东西，**不要**提前升 `shared/`。

---

## 10. 架构不变式

视为回退：

1. 以 store 为服务器状态真相源
2. 页面 / shared 裸 `invoke()`
3. `shared` 塞实体业务
4. 第二套路由 DSL 与 route file / memory 分叉
5. QC runtime/domain/layout 揉成巨型 provider
6. 命令 / 批量塞回单页内部
7. 跨 feature 绕过 public 深 import
8. 再引入 `SpaceLayout` / `app/layouts` / `shared/ui` 旧路径叙述

---

## 11. 推荐验证

```bash
bun run check
# 含 typecheck · lint · feature boundaries · format · tests · rust
```

文档核对：

1. 路由仍是 TanStack hash + `src/routes/**`
2. 壳路径是 `layout/`，不是 `app/layouts`
3. public 与 boundaries 仍绿
4. 无 React Router / 已删 feature 壳的误导描述
