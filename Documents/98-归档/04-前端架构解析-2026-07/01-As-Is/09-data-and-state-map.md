# As-Is · 09 数据 / 状态 / 副作用地图

> 状态：**W8 完成**（2026-07-15）· **Phase A As-Is 收官分册**  
> 范围：前端 only（决策 6=C）。IPC 只记 **invoke 命令名**；Rust 实现另档。  
> 汇总 W1–W7 数据面事实 + 本 wave 全仓扫描。

---

## 0. 执行摘要

| 面 | 真相源 | 健康度 |
|----|--------|--------|
| 当前 URL | TanStack Router | ✅ |
| 业务/持久化实体数据 | TanStack Query + feature `api` invoke | ✅ 主体正确 |
| 工作区刷新 | events → `useWorkspaceSync` → `invalidateWorkspaceQueries` | ✅ 薄；可能偏宽 |
| 导航恢复 | Tauri Store `shell.navigation.restore` | ✅ 不镜像当前 URL |
| UI 瞬态 | Zustand / Provider / local | ✅ 大体正确 |
| 实体抽屉 | **URL search** `?task=` / `?project=` | ✅（非 useDrawerStore） |
| 分层危险 | shared 反向依赖、nav badges 直打 api | ⚠️ 见双通道 |

**无「Query 列表整表双写进 Zustand」的 Critical 发现。**  
`useShellNavStore` 为 route 衍生 UI 缓存，需保持只由 ShellRouteLayout 写入。

---

## 1. Server state · TanStack Query

### 1.1 QueryClient 全局默认（核对）

| 项 | 值 |
|----|-----|
| staleTime | 30s |
| gcTime | 10min |
| refetchOnWindowFocus | false |
| query retry | 1 |
| mutation retry | 0 |

装配：`App.tsx` → `createAppQueryClient` → 同实例注入 Router context。

### 1.2 领域与 key 工厂

| 域 root key | feature | keys 文件 | 主要形状 |
|-------------|---------|-----------|----------|
| `['tasks']` | task | `task.keys.ts` | list(input), detail(id), links(id) |
| `['projects']` | project | `project.keys.ts` | overview(scope,viewKey), sidebar(scope), detail(id) |
| `['spaces']` | space | `space.keys.ts` | visible() |
| `['lifecycle']` | lifecycle | `lifecycle.keys.ts` | list(mode, scope, filter) |
| `['views']` | view | `view.keys.ts` | list(entityType, visibleOnly), taskRun(input) |
| `['activity']` | activity | `activity.keys.ts` | entity(request) |
| `['global-search']` | global-search | `search.keys.ts` | query(input) |
| `['healthcheck']` | healthcheck | `healthcheck.keys.ts` | status() · **无接线** |
| `['display-options','task']` | display-options | `taskDisplayOptions.keys.ts` | preference(pageKey) |

**约定：** `invalidateWorkspaceQueries` 按 **单段 root** 失效：`tasks|projects|spaces|lifecycle|views|activity`。  
注意：`global-search` / `healthcheck` / `display-options` **不在** workspace 默认失效集。

### 1.3 Mutations（hooks）

| 域 | mutations |
|----|-----------|
| task | create / update / archive / restore / delete；link create/update/delete |
| project | create / update / complete / reopen / archive / restore / delete |
| space | create / update / setDefault / archive / restore / delete |
| lifecycle | restore / delete / permanentlyDelete entry |
| view | create / update / delete / toggleVisible / reorder |
| display-options | updateTaskDisplayPreference |

**副作用模式（task 等）：** mutation 成功 → `emitEvent(task:*)` / `lifecycle:changed` → workspace sync 订阅 → invalidate。  
部分 mutation 内亦直接 invalidate（以各 `*.mutations.ts` 为准）。

### 1.4 跨 feature invalidate

| 入口 | 行为 |
|------|------|
| `features/workspace` `useWorkspaceSync` | debounce 80ms / 重操作 500ms → `invalidateWorkspaceQueries` |
| Tauri `workspace/changed` | 可带 `changedDomains` 子集失效 |
| Shell bulk `refreshLoadedSlices` | 全量 workspace domains |
| 各 mutation | 域内 keys + 事件 |

**债 DATA-D1：** 默认全域 invalidate 可能过宽（性能）；需产品可接受换精准。

### 1.5 不走 Query 的数据读

| 路径 | 说明 |
|------|------|
| `useSidebarNavBadges` | 直接 `listTasks` / lifecycle / projects **api** | 双通道风险 |
| bulk adapters | 运行时 list + mutate api | 可接受 |
| routeMemory 校验 | getTaskDetail / getProjectDetail | 导航用 |
| sync/update controllers | 自有 state + invoke | 非实体列表 |

---

## 2. Client state 分布

### 2.1 Zustand

| Store | 位置 | 内容 | 持久化 | URL/Query 镜像？ |
|-------|------|------|--------|------------------|
| `useShellNavStore` | layouts/shell | scopeType, spaceId, activeSection | 否 | **衍生自 route**（只写不读作真相） |
| `useDialogStore` | layouts/shell | command/shortcut/create/customDate | 否 | 否 |
| `useDrawerStore` | layouts/shell | drawer open/kind | 否 | **半死**；真抽屉用 URL |
| `useShellPreferenceStore` | layouts/shell | 项目树折叠、board 打开 sections | **localStorage** 部分 | 否 |
| `useSidebarSettingsStore` | layouts/shell | 侧栏可见/宽/设备偏好合并 | Tauri + settings api | 否 |
| `useSearchFocusIntentStore` | global-search | 聚焦搜索意图 | 否 | 否 |
| `useUpdateStore` | update | 更新 UI phase | 否（会话 hydrate） | 否 |
| `useEventBus` | shared/events | 监听器 map | 否 | 事件总线非业务缓存 |

### 2.2 Provider / 外部 store（非 Zustand）

| 机制 | 位置 | 内容 |
|------|------|------|
| SubmitRegistry | submit | useSyncExternalStore 注册表 |
| CommandSelection | selection | React state 注册 |
| PageFilter | filter | 页筛选 |
| DangerConfirm | danger-confirm | Promise 确认 |
| BulkAction | bulk-action | runtime + isExecuting |
| TaskPreview | task/detail | 预览 |
| ShellRouteContext | layouts | 当前 ShellRoute 快照 |
| QuickCreate session/domain | quick-create | reducer+provider |
| SyncStatusController | sync | useState + poll/listen |
| Command runtime | command | Shell 内实例 |

### 2.3 URL 作为状态

| 状态 | 载体 |
|------|------|
| 工作路径 / scope / section | pathname（Router） |
| 设置分区 | `/…/settings/$section` |
| 实体抽屉 | search `task` / `project`（entity-detail） |
| debug activity | search entityType/id/limit |
| 当前任务详情页 | `/spaces/:id/tasks/:taskId` |

---

## 3. IPC facade 命令名（前端 invoke）

> 扫描 `src/**/api/**/*.ts`（非 test）。后端契约对照另档。

### 3.1 领域

| 域 | 命令 |
|----|------|
| **task** | `list_tasks`, `get_task_detail`, `create_task`, `update_task`, `archive_task`, `restore_task`, `delete_task`, `list_task_links`, `create_task_link`, `update_task_link`, `delete_task_link` |
| **project** | `list_project_overview`, `list_sidebar_projects`, `get_project_detail`, `create_project`, `update_project`, `complete_project`, `reopen_project`, `archive_project`, `restore_project`, `delete_project` |
| **space** | `list_visible_spaces`, `create_space`, `update_space`, `set_default_space`, `archive_space`, `restore_space`, `delete_space`, **`set_active_scope`**, **`take_pending_command_open_intent`** |
| **lifecycle** | `list_archive_entries`, `list_trash_entries`, `permanently_delete_space`, `permanently_delete_project`, `permanently_delete_task`（restore/delete 转调实体 api） |
| **view** | `list_views`, `run_task_view`, `create_view`, `update_view`, `delete_view`, `toggle_view_visible`, `reorder_views` |
| **activity** | `get_entity_activities` |

### 3.2 平台 / 系统

| 域 | 命令 |
|----|------|
| **search** | `search_entities` |
| **healthcheck** | `healthcheck` |
| **settings sidebar** | `get_sidebar_settings`, `update_sidebar_item_visibility`, `update_sidebar_project_section` |
| **sync** | `get_sync_status`, `get_sync_diagnostics`, `run_sync`, `configure_sync`, `update_sync_policy`（以 api/sync.ts 全量为准） |
| **update** | `check_update`, `download_and_install`, `restart_and_install`, `skip_version`, `set_check_mode`, `set_channel`, `set_check_interval_secs`, `get_update_settings`, `get_update_session`, `cancel_update_download` |
| **quick-create** | `quick_create_get_initial_state`, `quick_create_commit_layout`, `quick_create_present_session`, `quick_create_search`, `quick_create_create`, `quick_create_create_and_open`, `quick_create_open_target`, `quick_create_close_session`, `quick_create_list_projects_by_space`, `quick_create_frontend_ready`, `quick_create_frontend_unready`, `quick_create_report_layout_diagnostics` |

### 3.3 非 invoke 的桌面 API

| API | 用途 |
|-----|------|
| `@tauri-apps/plugin-store` LazyStore | 导航恢复、侧栏设备偏好、display-options |
| `@tauri-apps/api/event` listen | tasks/workspace/sync/command/update 事件 |
| `@tauri-apps/api/app` getVersion | Footer 版本 |
| shellDevicePreferences 内 **裸 invoke** | W2 SHELL-D3 |

---

## 4. 事件

### 4.1 前端内部事件（`emitEvent` / eventBus）

| type | payload 要点 | 典型发射 |
|------|--------------|----------|
| `task:created/updated/deleted` | taskId | task mutations |
| `project:created/updated/deleted` | projectId | project mutations |
| `space:created/updated/deleted` | spaceId | space mutations |
| `workspace:restored` | source: sync_restore | sync 恢复路径 |
| `lifecycle:changed` | entityType, entityId, operation? | archive/restore/delete 等 |

订阅中枢：`useWorkspaceSync`（+ 其他可选）。

### 4.2 Tauri 事件

| 事件名 | 封装 | 用途 |
|--------|------|------|
| `stoneflow://tasks/changed` | taskChanged.ts | 跨窗/后端任务变更 |
| `stoneflow://workspace/changed` | workspaceChanged.ts | 同步后域变更 |
| `stoneflow://command/open` | commandOpen.ts | 外部打开任务/项目 |
| `stoneflow://sync/status-changed` | sync controller | 同步状态 |
| update phase（`UPDATE_EVENTS.PHASE`） | update api/events | 更新进度阶段 |

### 4.3 刷新链路（简图）

```txt
mutation / Tauri event / bulk
  → emitEvent 和/或 listen
  → useWorkspaceSync debounce
  → invalidateWorkspaceQueries(['tasks'|…])
  → React Query 重拉已挂载观察者
```

---

## 5. 持久化（前端触及）

### 5.1 Tauri Store 文件

| 文件 | key | 模块 | 用途 |
|------|-----|------|------|
| `shell-device-preferences.json` | `shell.navigation.restore` | routeMemoryStore | 启动/scope 路径记忆 |
| 同上 | `shell.sidebar.device` | shellDevicePreferences | 侧栏宽/折叠等 |
| 同上 | `shell.ui.device` | 同上 | 如 drawer 宽 |
| `display-options-preferences.json` | per pageKey | display-options api | 列表展示偏好 |

### 5.2 Web Storage

| key | 位置 | 用途 |
|-----|------|------|
| `stoneflow.settings.lastSection` | lastSettingsSection | 上次设置分区（local+session 兜底） |
| `stoneflow:project-task-board-open-sections:v2` | useShellPreferenceStore persist | 项目任务板打开 sections |

### 5.3 URL search（抽屉）

| key | 含义 |
|-----|------|
| `task` | 打开任务抽屉 |
| `project` | 打开项目抽屉 |

---

## 6. 多窗口

| 窗口 | 入口 | 状态隔离 | 共享 |
|------|------|----------|------|
| **main** | `_shell/*` 等 | QueryClient 本窗；Store 文件可共享 | 实体数据经 IPC/事件 |
| **quick-create** | `/quick-create` | 独立 session/domain；独立 QC IPC | 创建后经后端事件/刷新主窗 |

主窗 `takePendingCommandOpenIntent` / `command/open` 事件：快捷捕获打开实体。

---

## 7. 双真相源 / 双通道检查

| 检查项 | 结果 | 说明 |
|--------|------|------|
| Store 缓存 Query 任务列表 | **Pass** | 未发现 |
| Store 镜像当前 path 作导航真相 | **Pass** | nav store 仅衍生 |
| URL 抽屉 vs useDrawerStore | **Partial** | 两套概念；生产用 URL |
| nav badges 直打 api vs Query | **Partial** | DATA-D2 双通道 |
| shellDevicePreferences 裸 invoke | **Partial** | 应走 settings api |
| settings 不可记忆 path | 产品/遗漏 | W1 NAV-D3 |
| 多处手拼 path | 未全仓审计 | intents 为主；W7 未重做 |
| display-options 本地 Store + Query keys | **Pass** | 偏好非实体 |

---

## 8. 数据面债（进 Gap）

| ID | 项 | 严重度 |
|----|-----|--------|
| DATA-D1 | workspace 默认全域 invalidate 可能过宽 | med |
| DATA-D2 | sidebar badges 绕过 Query | med |
| DATA-D3 | useDrawerStore 与 entity-detail 双轨 | med |
| DATA-D4 | healthcheck Query 无消费者 | low（死接线） |
| DATA-D5 | shell 设备偏好裸 invoke | med |
| DATA-D6 | global-search / display-options 不在 workspace invalidate | low（或正确） |

---

## 9. 与分层结论的咬合

```txt
UI / scene
  → feature query hooks / mutations
  → feature api (invoke)
  → Rust

UI 瞬态 → Zustand / Provider
URL → Router
恢复 path → Tauri Store
跨切片一致性 → events + workspace invalidate
```

**禁止回退：** 组件裸 invoke、store 复制实体列表、第二套路由状态机。

---

## 10. As-Is Phase A 收官核对

| 验收项（README §4） | 状态 |
|--------------------|------|
| 模块注册表几乎全覆盖 | ✅ W0–W6 |
| routes/nav/layouts 文件级 | ✅ W1–W2 |
| features 平台/领域/场景 | ✅ W3–W5 |
| shared/styles/test | ✅ W6 |
| 依赖矩阵 Delete/入出度 | ✅ W7 |
| 数据面 Query/IPC/事件/Store | ✅ **W8** |
| 评分与结论卡 | ✅ 分册内；Gap 汇总待 Phase B |
| 漂移日志 | ✅ 附录（未批量回写 T1） |

**Phase A 完成。** 下一步：**Phase B Gap**（`02-Gap/`）用统一矩阵排序债务，再 To-Be / Migrate。

---

## 11. Session 收口

- W8 完成数据面全图  
- As-Is 调研波次 **W0–W8 全部完成**  
- 建议下一动作：填写 `02-Gap/评估矩阵.md` + `耦合热点与反模式.md`（不必再扫目录）  
