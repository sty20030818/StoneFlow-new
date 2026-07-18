# As-Is · 03 App Shell & Layouts

> 状态：**W2 深挖完成**（2026-07-15）
> 范围：`src/main.tsx`、`src/app/App.tsx`、`src/app/providers/**`、`src/app/layouts/**`
> 不含：`navigation` / `router`（见 [02](./02-routes-and-navigation.md)）
> 短契约对照：[`src/app/layouts/ARCHITECTURE.md`](../../../src/app/layouts/ARCHITECTURE.md)（**有漂移**，见 §9）

---

## 0. W2 结论速览

| 模块 | 评级 | Delete 分 | 建议动作 |
|------|------|-----------|----------|
| `main` + `App` + providers | **Optimal** | 1 | Keep |
| `ShellRouteLayout` | **Acceptable** | 1 | Keep |
| `ShellLayout`（装配上帝组件） | **Debt** | 1 | Keep · Gap 优先拆装配 |
| `shell` UI 分区 Header/Sidebar/… | **Acceptable** | 2–3 | Keep |
| `shell/model` stores | **Acceptable** | 2 | Keep；drawer 半死 |
| `MainCard` | **Optimal** | 3 | Keep |
| `EntityScene` + board adapters | **Acceptable** | 3 | Keep |
| `SpaceLayout` | **Debt** | 5 | 澄清：仅测试 / 或删除 |

**总体：** 启动与 Query 边界干净；**真正的壳装配在 `ShellLayout`（~1270 行）**，是跨 feature 的 God composition root。MainCard / EntityScene 分层意图清晰。生产路径 **不是** 文档写的 `SpaceLayout → ShellLayout`，而是：

```txt
routes/_shell/{all|spaces}/route
  → useRememberCurrentShellRoute
  → ScopedShellRouteLayout(scope)
       → parseShellRoute(location)
       → ShellRouteLayout(scope, shellRoute)
            → useWorkspaceSync / nav store / setActiveScope
            → ShellRouteProvider
            → ShellLayout  [providers + chrome + command/bulk 接线]
                 → Outlet children（feature pages）
                      → EntityScene → BoardAdapter → feature/shared board
```

---

## 1. 启动与全局 Provider 树

### 1.1 启动链

```txt
main.tsx
  StrictMode
  → App
       useState(createAppQueryClient)
       → QueryClientProvider
       → AppProviders          // TooltipProvider + Toaster
       → RouterProvider(router, context: { queryClient })
            → routes…
                 →（工作路径）ShellRouteLayout → ShellLayout providers…
```

| 文件 | 职责 | 行数级 |
|------|------|--------|
| `src/main.tsx` | DOM mount、全局 CSS | ~10 |
| `src/app/App.tsx` | QueryClient 生命周期 + Router 注入 | ~20 |
| `src/app/providers/AppProviders.tsx` | Tooltip + Sonner Toaster | ~14 |
| `src/app/providers/query/queryClient.ts` | `createAppQueryClient` 默认策略 | ~18 |
| `src/app/providers/query/index.ts` | re-export | barrel 极小 |

### 1.2 QueryClient 默认（代码核对 ✅）

| 项 | 值 |
|----|-----|
| `staleTime` | 30s |
| `gcTime` | 10min |
| `refetchOnWindowFocus` | false |
| query `retry` | 1 |
| mutation `retry` | 0 |

### 1.3 全局 vs Shell 级 Provider

| 层级 | Provider | 位置 | 为何在这层 |
|------|----------|------|------------|
| App 全局 | `QueryClientProvider` | App.tsx | 全 app 数据缓存；router context 同实例 |
| App 全局 | `TooltipProvider` | AppProviders | 全局 tooltip |
| App 全局 | `Toaster` | AppProviders | 全局 toast |
| Shell | `CommandSelectionProvider` | ShellLayout | 仅主壳需要选择/命令 |
| Shell | `SubmitRegistryProvider` | ShellLayout | 提交目标注册 |
| Shell | `PageFilterProvider` | ShellLayout | 页级筛选 |
| Shell | `DangerConfirmProvider` | ShellLayout | 危险确认 |
| Shell | `TaskPreviewProvider` | ShellLayout | 任务预览 |
| Shell | `BulkActionProvider` | ShellLayoutBulkActionBoundary | 注入 task/project/lifecycle adapters |
| Shell | `SidebarProvider` | ShellLayoutContent | 侧栏几何/折叠（shared UI） |
| Shell | `SyncStatusProvider` | ShellLayoutContent 内 | Footer 同步状态 |
| Shell | `ShellRouteProvider` | ShellRouteLayout | 当前 `ShellRoute` 上下文 |

**不在 App 全局的原因：** 命令/批量/筛选/预览只服务主工作区壳；Quick Create 等独立窗不需要整套。

### 1.4 FE-APP-ENTRY / PROVIDERS 六卡摘要

| 项 | 结论 |
|----|------|
| 职责 | 启动与全局横切（Query/Tooltip/Toast） |
| 不负责 | 业务规则、壳导航、feature 装配 |
| Delete | **1** |
| 评级 | **Optimal** |
| 质量 | 边界干净；`query/index.ts` 小 barrel 可接受 |

---

## 2. 布局栈：生产路径 vs 遗留

### 2.1 生产路径（W1+W2 对齐）

| 步骤 | 组件/文件 | 职责 |
|------|-----------|------|
| 1 | `routes/_shell/all/route.tsx` 或 `spaces/$spaceId/route.tsx` | 定 scope；`useRememberCurrentShellRoute` |
| 2 | `ScopedShellRouteLayout` | `parseShellRoute(location)` → 调 `ShellRouteLayout` |
| 3 | `ShellRouteLayout` | workspace sync、nav store、active scope IPC、缺失 space redirect、挂 Provider + ShellLayout |
| 4 | `ShellLayout` | feature providers + 命令/批量/对话框/壳 chrome |
| 5 | `ShellMain` children | route `Outlet` → feature 页面 |
| 6 | 页面内 | `EntityScene` / `MainCard` 编排 board |

### 2.2 `SpaceLayout` — 非生产入口

| 字段 | 内容 |
|------|------|
| 路径 | `src/app/layouts/SpaceLayout.tsx` |
| 实现 | `useCurrentShellRoute()` → 再包一层 `ShellRouteLayout` |
| 生产引用 | **无**（仅 `SpaceLayout.test.tsx`） |
| 问题 | 依赖已存在的 `ShellRouteProvider`，但 Provider 由 `ShellRouteLayout` 创建 → 语义自相矛盾/仅测试自洽 |
| 短契约 | `ARCHITECTURE.md` 仍写 SpaceLayout 为工作路径入口、且写 rememberShellRoute（**已迁到 route**） |
| 评级 | **Debt** |
| 建议 | Document-only 或 Delete（测完迁到 ShellRouteLayout）；**Migrate 候选** |

### 2.3 `ShellRouteLayout` 文件卡

| 字段 | 内容 |
|------|------|
| 路径 | `ShellRouteLayout.tsx` |
| 职责 | 工作区壳边界：同步 scope/section 到 zustand；`useWorkspaceSync`；`setActiveScope`；非法 space 跳 fallback；提供 `ShellRouteProvider`；渲染 `ShellLayout` |
| 不负责 | 命令系统、侧栏 UI、页面 board |
| 上游 | navigation intents/shellRoute 类型、space query/api、workspace sync、shell nav store |
| 下游 | 仅 ScopedShellRouteLayout（生产）+ SpaceLayout（测试） |
| Delete | **1** |
| 评级 | **Acceptable**（职责正确；与过时 SpaceLayout 文档并存） |

**关键 effect：**

1. `routeSpaceIsMissing` → `navigate(openSection(fallback…))`
2. 同步 `useShellNavStore` 的 scope/section（**镜像 URL 语义到 store**，供 sidebar 等读；URL 仍为真相源）
3. `setActiveScope(scope)` IPC（失败只 log）

---

## 3. `ShellLayout` — 装配上帝组件

### 3.1 身份

| 字段 | 内容 |
|------|------|
| 路径 | `shell/ShellLayout.tsx` · **~1271 LOC** |
| 结构 | `ShellLayout` → providers 嵌套 → `ShellLayoutBulkActionBoundary` → `ShellLayoutContent` |
| 一句话 | 主窗口工作区的 **composition root**：装 provider、接命令/批量、渲 Header/Sidebar/Main/Footer、挂创建弹窗与更新 UI |
| 不负责（理想） | 领域规则真相、board 实现 |
| 实际沾边 | 大量 feature 接线（command actions、bulk adapters、space CRUD、create dialogs） |

### 3.2 Provider 嵌套（代码顺序）

```txt
CommandSelectionProvider
  SubmitRegistryProvider
    PageFilterProvider
      DangerConfirmProvider
        TaskPreviewProvider
          BulkActionProvider(actions, adapter)
            SidebarProvider
              SyncStatusProvider
                CommandShortcutLayer
                ShellHeader
                [SettingsSidebar | ShellSidebar] + ShellMain(children)
                CreateDialogShell (task/project)
                CustomDateDialog?
                UpdateDialog
                SystemStatusChip
                ShellFooter
```

### 3.3 `ShellLayoutContent` 装配清单（按关注点）

| 关注点 | 接线内容 |
|--------|----------|
| 路由/历史 | `useShellSessionRouteHistory`；settings 返回 path ref |
| 对话框 | `useDialogStore`（command/shortcut/create/customDate） |
| 实体抽屉 | `useEntityDetailController`（**非** useDrawerStore 主路径） |
| 预览 | `useTaskPreviewController` |
| 命令 | `useCommandContext/Runtime/Runner` + 巨大 `shellCommandActions` |
| 批量 | `runBulkAction` + command 内实体 bulk |
| 筛选 | `PageFilterContext` → command view + Header |
| 提交 | `SubmitRegistry` intents |
| 数据 | `useSpaces`、sidebar projects、project options、nav badges、command 打开时拉 projects |
| Space CRUD | create/update/default/archive/delete mutations → Sidebar |
| 更新 | `useUpdateEvents`、`UpdateDialog`、`SystemStatusChip` |
| 同步 | `SyncStatusProvider` + Footer 内 sync item |
| 侧栏设置 | `useSidebarSettingsStore` load；宽度/折叠/可见性 |
| 快捷打开 | `useCommandOpenListener` + `takePendingCommandOpenIntent` |
| 骨架 | spaces/settings 未就绪 → `ShellLayoutSkeleton` |

### 3.4 Bulk adapter 注入

| Adapter | 数据源 | refresh |
|---------|--------|---------|
| task | createTaskBulkAdapter | `invalidateWorkspaceQueries` |
| project | listAllVisibleProjects ids | 同上 |
| lifecycle | archive+trash entries | 同上 |

### 3.5 依赖卡（ShellLayout 爆炸半径）

**上游（import 极多，抽样）：**

- navigation：intents、shellRoute 类型、sessionRouteHistory
- shell model：dialog、sidebar settings、taskOpenStrategy、nav badges
- features：command\*, bulk-action\*, selection, submit, filter, danger-confirm, entity-detail, task/*, project/*, space/*, lifecycle api, metadata-fields, global-search intent, sync, update, settings section
- shared：events, query invalidation, ui create-dialog / sidebar / patterns

**下游：** 仅 `ShellRouteLayout`

**Delete 分：1**（主应用壳）

### 3.6 质量卡

| 检查项 | 结果 | 证据 |
|--------|------|------|
| 壳装配集中 | **Pass**（意图正确） | 单文件集中 |
| 装配是否过重 | **Fail / Debt** | 1271 行；命令 actions  alone 上百行 |
| boolean props 爆炸 | **Partial** | Header 接收大量 props 透传 |
| 无裸 invoke | **Partial** | ShellLayout 本身经 feature；但 `shellDevicePreferences` 有 `invoke`（§5） |
| URL 不镜像 | **Partial** | nav store 同步 section/scope（衍生缓存，可接受但需纪律） |
| Provider state/actions/meta | **Partial** | 各 feature provider 内部分别评（W3） |
| 可删除平台 feature | **Fail 理想 A** | 卸 command/bulk 需大改本文件 |

### 3.7 结论

- **评级：Debt**（能跑、边界「在壳里装配」正确，但 **God file** 阻碍可删除性与演进）
- **Top 风险：** 单文件同时拥有 UI 树 + 命令总线 + bulk + 创建流 + space 管理；任何平台 feature 变更都碰这里
- **不改理由（KISS）：** 大拆无测试锁全行为前风险高；W3 先摸清 feature 公开 API
- **建议动作：Keep 行为**；To-Be 拆为
  - `ShellProviders`（仅嵌套）
  - `useShellCommandBridge`（actions/runtime）
  - `ShellChrome`（Header/Sidebar/Main/Footer）
  - `ShellOverlays`（create/update dialogs）
- **Delete 理想差距：** 删 `features/command` 无法只改 route——必须改本文件数十处 → **true-platform 纠缠在装配根**

---

## 4. Shell 分区 UI

### 4.1 文件级职责表

| 文件 | LOC 约 | 职责 | 备注 |
|------|--------|------|------|
| `ShellHeader.tsx` | 445 | 顶栏：back/forward、历史、command menu、shortcut help、UserAppMenu… | 重 props 来自 ShellLayout |
| `header/NavBackForward.tsx` | | 前进后退按钮 | |
| `header/HistoryDropdown.tsx` | | 最近浏览 | 消费 session history entries |
| `header/UserAppMenu.tsx` | | 头像菜单 / 进设置等 | |
| `ShellSidebar.tsx` | 658 | 主导航、space 切换、项目列表、上下文菜单、自定义可见性 | 重业务回调 props |
| `SettingsSidebar.tsx` | | 设置模式侧栏 | settings section nav |
| `settingsNav.ts` | | 设置导航分组配置 | |
| `ShellMain.tsx` | 202 | 主卡容器 + preview + drawer + 空白点击/右键新建 | |
| `ShellDrawer.tsx` | 38 | Sheet + `EntityDetailDrawerHost` | 薄 |
| `ShellFooter.tsx` | 30 | 同步状态 + 更新/版本 | 薄 |
| `config.ts` | 561 | 导航项、label、drawer detail 展示结构等 | **被 navigation sessionHistory 依赖**（W1 NAV-D1） |
| `types.ts` | | `ShellSectionKey`、`ShellDrawerKind` | |
| `sidebar/*` | 12 files | 行组件、菜单、Space 图标、constants | 含 `sidebar/index.ts` barrel |
| `ShellLayoutSkeleton` | 内联 | 加载态骨架 | |

### 4.2 Settings mode

- `shellRoute.isSettingsPath` → 换 `SettingsSidebar`，保留 `settingsReturnPathRef` 供返回应用
- 主内容仍为 settings route 的 `SettingsPage`（Outlet children）

### 4.3 评级

| 块 | 评级 | Delete | 说明 |
|----|------|--------|------|
| Header/Sidebar | Acceptable | 2 | 可抽文件，但强依赖 ShellLayout props |
| Main/Drawer/Footer | Optimal–Acceptable | 3 | 相对薄 |
| config.ts | Acceptable | 2 | 导航配置中心；体积大 |

---

## 5. Shell model · 客户端状态

### 5.1 Store / Context 表

| 模块 | 技术 | 状态内容 | 持久化 | 是否 URL 镜像 | 主消费者 |
|------|------|----------|--------|---------------|----------|
| `useShellNavStore` | Zustand | scopeType、spaceId、activeSection | 否 | **衍生同步**（从 route effect 写入） | ShellRouteLayout、Sidebar 等 |
| `useDialogStore` | Zustand | command 开闭/mode、shortcut help、create task/project、custom date | 否 | 否 | ShellLayout、Header、多处 open* |
| `useDrawerStore` | Zustand | drawer open/kind/id | 否 | 否 | **主要被 dialog 互斥调用**；实体抽屉走 entity-detail |
| `useShellPreferenceStore` | Zustand+persist | 项目树折叠、board 打开 sections | localStorage 部分 | 否 | board/sidebar 相关 |
| `useSidebarSettingsStore` | Zustand | 侧栏可见性/宽度/设备偏好合并 | Tauri store + settings api | 否 | ShellLayout、Sidebar |
| `shellDevicePreferences.ts` | LazyStore + **裸 invoke** | sidebar/ui 设备偏好 | `shell-device-preferences.json` | 否 | sidebar settings store |
| `ShellRouteContext` | React context | 当前 `ShellRoute` | 否 | 是 location 的解析快照 | pages via `useCurrentShellRoute` |
| `taskOpenStrategy.ts` | 纯函数 | command open → path；detail 开闭语义 | 无 | 无 | ShellLayout |
| `useSidebarNavBadges.ts` | hook+state | section 角标数字 | 否 | 否 | 直接打 task/lifecycle/project **api** |

### 5.2 `useDrawerStore` 半死状态

- 生产实体抽屉：`useEntityDetailController` + `ShellDrawer`
- `useDrawerStore`：dialog 打开时 closeDrawer；测试 mock
- **风险：** 两套 drawer 概念并存，新人易用错
- 建议 Gap：确认是否可 Delete `useDrawerStore` 或收口为唯一 API

### 5.3 `shellDevicePreferences` 裸 invoke

```txt
import { invoke } from '@tauri-apps/api/core'
```

违反「组件/壳不散落裸 invoke、走 feature api」精神（设备偏好若属 settings，应进 `features/settings/api`）。
质量：**Partial/Fail** · 债 ID **SHELL-D3**。

### 5.4 与 Query 边界

- Shell 不把任务列表放进 Zustand
- badges 用 imperative api list*（非 Query hooks）→ 可能与 Query 缓存双通道（**SHELL-D4**，W8 再评）

---

## 6. MainCard

### 6.1 身份

| 字段 | 内容 |
|------|------|
| 路径 | `main-card/MainCardLayout.tsx` · ~212 LOC + test |
| 模式 | Compound：`MainCard.Root/Header/Toolbar/Body/Footer/NoticeGroup/Section/Empty/GhostAction…` |
| 职责 | 页级骨架与 scroll/toolbar 插槽 |
| 不负责 | 业务分叉、Query、实体 mutation |
| 依赖 | shared ui patterns、AppScrollArea、Button |
| 消费者 | EntityScene；多 feature 页面直接用 GhostAction / 局部 MainCard |
| Delete | **3**（页面可改用别的骨架，但全站统一会碎） |
| 评级 | **Optimal** |
| Composition | **Pass**（compound，非 boolean 模式堆） |

---

## 7. EntityScene + Board adapters

### 7.1 身份

| 字段 | 内容 |
|------|------|
| EntityScene | 页级编排：header/toolbar/notices/board/footer/bulkBar → MainCard |
| types.ts | `EntitySceneProps`、三种 board 的 config/data/actions 联合类型 |
| TaskBoardAdapter | props → `features/task/ui/TaskBoard` |
| ProjectBoardAdapter | → project board UI |
| LifecycleBoardAdapter | → lifecycle board UI |
| `index.ts` | **barrel** 导出 EntityScene + types（违反「默认无 barrel」；消费者多用此路径） |

### 7.2 数据流（正确边界）

```txt
feature page
  → 自有 query/model 准备 boardData/actions
  → <EntityScene board={{ boardKind, config, data, actions }} …slots />
  → Adapter 映射到 feature Board 组件
  → shared/ui/board|row 等
```

EntityScene **不**直接 invoke / query。✅
但 **types.ts 强依赖** display-options、metadata-fields、task priority、shared entity 类型 → 编排层类型与领域耦合（可接受的契约耦合）。

### 7.3 消费者（feature pages）

| Feature 页面 | 使用 |
|--------------|------|
| inbox, all-tasks, no-project, views | EntityScene + 常 MainCard.GhostAction |
| project, project-overview | EntityScene |
| lifecycle (archive/trash 列表) | EntityScene |
| settings | EntityScene（可无 board） |
| task detail | MainCard（非 EntityScene board） |
| activity debug | MainCard only |

### 7.4 质量 / 结论

| 项 | 结果 |
|----|------|
| 编排 vs 业务 | **Pass** |
| Adapter 薄 | **Pass** |
| barrel index | **Partial** |
| types 领域泄漏 | **Partial** |
| 评级 | **Acceptable** |
| Delete | **3** |
| 建议 | Keep；To-Be 可把 board 契约类型下沉 shared 或 feature 边界包 |

---

## 8. 全文件级清单（layouts 非测试）

> 测试文件略；职责一句话。

| 路径 | 职责 |
|------|------|
| `SpaceLayout.tsx` | 遗留/测试用壳入口 |
| `ShellRouteLayout.tsx` | 生产 scope 桥 + Shell 挂载 |
| `shell/ShellLayout.tsx` | God composition root |
| `shell/ShellHeader.tsx` | 顶栏 |
| `shell/ShellSidebar.tsx` | 主侧栏 |
| `shell/SettingsSidebar.tsx` | 设置侧栏 |
| `shell/settingsNav.ts` | 设置导航配置 |
| `shell/ShellMain.tsx` | 主区+preview+drawer 宿主 |
| `shell/ShellDrawer.tsx` | 详情抽屉壳 |
| `shell/ShellFooter.tsx` | 底栏 |
| `shell/config.ts` | 导航/label/drawer 展示配置 |
| `shell/types.ts` | section/drawer 类型 |
| `shell/model/ShellRouteContext.tsx` | ShellRoute context |
| `shell/model/useShellNavStore.ts` | scope/section UI store |
| `shell/model/useDialogStore.ts` | 命令/创建/日期对话框 |
| `shell/model/useDrawerStore.ts` | 旧 drawer store |
| `shell/model/useShellPreferenceStore.ts` | 树折叠/board sections |
| `shell/model/useSidebarSettingsStore.ts` | 侧栏设置聚合 |
| `shell/model/shellDevicePreferences.ts` | 设备偏好 Tauri store + invoke |
| `shell/model/taskOpenStrategy.ts` | open path / detail 状态纯函数 |
| `shell/model/useSidebarNavBadges.ts` | 角标计数 |
| `shell/header/*` | 历史/前进退/用户菜单 |
| `shell/sidebar/*` | 侧栏行与菜单 |
| `main-card/MainCardLayout.tsx` | 页骨架 compound |
| `entity-scene/EntityScene.tsx` | 页编排 |
| `entity-scene/*BoardAdapter.tsx` | board 适配 |
| `entity-scene/types.ts` | 编排契约类型 |
| `entity-scene/index.ts` | barrel |

---

## 9. 文档漂移（写入附录）

| ID | 源 | 问题 | 代码事实 |
|----|-----|------|----------|
| DRIFT-004 | `layouts/ARCHITECTURE.md` | 生产入口写成 SpaceLayout；rememberShellRoute 在 SpaceLayout | 生产 = ScopedShellRouteLayout→ShellRouteLayout；remember 在 route |
| DRIFT-005 | 同上 §6 | 允许 `SpaceLayout -> app/routing` | `app/routing` 已删除 |
| DRIFT-006 | 同上结构树 | 未列 ShellRouteLayout / SettingsSidebar 等 | 以本分册为准 |

（决策 8=B：本阶段不改短契约，只记日志。）

---

## 10. 债务清单（Gap 候选）

| ID | 项 | 严重度 |
|----|-----|--------|
| SHELL-D1 | ShellLayout God file ~1271 LOC | **high** |
| SHELL-D2 | SpaceLayout 非生产 + 文档过时 | med |
| SHELL-D3 | shellDevicePreferences 裸 invoke | med |
| SHELL-D4 | nav badges 绕过 Query 直接 list api | low–med |
| SHELL-D5 | useDrawerStore 与 entity-detail 双轨 | med |
| SHELL-D6 | entity-scene / sidebar barrel index | low |
| SHELL-D7 | Header/Sidebar 重 props 透传（composition 压力） | med |
| SHELL-D8 | config.ts 561 行且被 navigation 依赖 | med（交叉 W1 NAV-D1） |

无新的双 URL 真相源 Critical；nav store 为 **衍生 UI 状态**，需保持「只由 ShellRouteLayout 从 route 写入」。

---

## 11. 可删除性对照（决策 2=A）

| 删除目标 | 是否接近装配+route |
|----------|-------------------|
| 某 scene feature | 页面不渲染 EntityScene 即可；Shell 仍在 | scene 可删，壳保留 |
| `features/command` | **否** — ShellLayout 整段 command bridge | true-platform 缠在壳 |
| `features/bulk-action` | **否** — BulkActionProvider + actions 大段 | 同上 |
| MainCard/EntityScene | 所有列表页重写骨架 | Delete 3 |
| ShellLayout 本身 | 主窗不可用 | Delete 1 |

**W2 对长期目标的含义：** 要实现「删 feature 只改装配+route」，必须把 ShellLayout 里的 **feature 特化 actions** 收成可插拔 registry（To-Be），否则平台 feature 永远 Delete 1 且改动面巨大。

---

## 12. 子系统评级汇总

| ID | 路径 | 评级 | Delete | 动作 |
|----|------|------|--------|------|
| FE-ENTRY-MAIN | main.tsx | Optimal | 1 | Keep |
| FE-APP-ROOT | App.tsx | Optimal | 1 | Keep |
| FE-APP-PROVIDERS | providers/* | Optimal | 1 | Keep |
| FE-APP-SHELL-ROUTE-LAYOUT | ShellRouteLayout.tsx | Acceptable | 1 | Keep |
| FE-APP-SHELL-LAYOUT | shell/ShellLayout.tsx | **Debt** | 1 | Keep→Split（To-Be） |
| FE-APP-SHELL-CHROME | Header/Sidebar/Main/… | Acceptable | 2–3 | Keep |
| FE-APP-SHELL-MODEL | shell/model/* | Acceptable | 2 | Keep；清理 drawer |
| FE-APP-MAIN-CARD | main-card/* | Optimal | 3 | Keep |
| FE-APP-ENTITY-SCENE | entity-scene/* | Acceptable | 3 | Keep |
| FE-APP-SPACE-LAYOUT | SpaceLayout.tsx | Debt | 5 | Delete 或仅测试标注 |

---

## 13. W2 未覆盖（留给后续）

- Header/Sidebar 每个子文件 props 级 API（过细，按需）
- command/bulk provider 内部实现 → **W3**
- badges 与 Query 一致性压测 → **W8**
- 视觉 token 与 shell CSS 变量 → **W6**

---

## 14. 验证建议

```bash
bun run typecheck
bun run test:run src/app/layouts
```

---

## 15. Session 收口

- W2 完成；壳层 **最大债 = ShellLayout 装配根**
- 生产路径与 W1 route 记忆已对齐
- **下一 Wave：W3** 平台 features（建议从 `command` 起）
