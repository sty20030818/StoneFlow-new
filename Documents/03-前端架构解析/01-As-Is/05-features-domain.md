# As-Is · 05 Features · 领域实体

> 状态：**W4 深挖完成**（2026-07-15）  
> 范围：`task` · `project` · `space` · `lifecycle` · `view` · `activity`  
> 场景页（inbox/all-tasks/views 复数…）→ **W5**；平台 → [04](./04-features-platform.md)

---

## 0. 章结论速览

| 优先级 | ID | 路径 | 文件数 | 外部消费者约 | Delete | 评级 | 建议 |
|--------|-----|------|--------|--------------|--------|------|------|
| 1 | FE-F-TASK | `task` | 79 | ~37 | **1** | **Debt–Acceptable** | Keep；内部分层可再收口 |
| 2 | FE-F-PROJECT | `project` | 18 | ~40 | **1–2** | **Acceptable** | Keep |
| 3 | FE-F-SPACE | `space` | 10 | ~24 | **1** | **Acceptable** | Keep；api 略杂 |
| 4 | FE-F-LIFECYCLE | `lifecycle` | 13 | ~6 | **3** | **Acceptable** | Keep（编排域） |
| 5 | FE-F-VIEW | `view` | 9 | ~7 | **3** | **Acceptable** | Keep；与 scene `views` 分工 |
| 6 | FE-F-ACTIVITY | `activity` | 7 | ~5 | **3–4** | **Acceptable** | Keep |

### 领域层总判断

1. **数据面模式统一且正确：** 各域基本都是 `api`（invoke facade）→ `query`（keys/queries/mutations）→ `model`/`ui`。裸 invoke **未**散落进页面（Pass）。  
2. **枢纽实体：** `task`（最大代码面）+ `project`/`space`（极高入度，列表/归属/记忆路径处处需要）。  
3. **编排域：** `lifecycle` 不自有实体表语义，**委托** task/project/space 的 delete/restore/permanent。  
4. **跨域依赖有向、大体健康：**  
   - `lifecycle → task|project|space`  
   - `task → project|space|activity`  
   - `project → task`（项目内任务板）  
   - **无** task↔project 环级别的运行时死锁；是产品耦合。  
5. **可删除性（决策 2=A）：** 领域实体 **不追求 Delete 5**——它们是产品内核。理想是「删 scene 不影响 domain」；反过来删 task 等于删产品。  
6. **主要债：**  
   - task 体积与 **detail 子树**（页/抽屉/预览三形态）  
   - space api 混入 `setActiveScope` / `takePendingCommandOpenIntent`（壳/命令边界泄漏）  
   - project 类型放在 feature model，同时 shared/types 也有实体类型（需 W8 对照）  
   - query 子目录有小 barrel `index.ts`（普遍）

---

## 1. 领域关系图（As-Is）

```txt
                    space
                   ╱  │  ╲
                  ╱   │   ╲
             project  │    setActiveScope (壳也调)
                │     │
                │   task ──────── activity (timeline / debug)
                │  ╱  │  ╲
                │ ╱   │   ╲
         ProjectTask  │    links / placement
              Board   │
                      │
                 lifecycle ──list archive/trash
                      │
            restore/delete 委托 task|project|space

                 view ── list/run/create 自定义视图
                      │
                 scene `views` 页消费 (W5)
```

### 领域 × 领域依赖

| from \ to | task | project | space | lifecycle | view | activity |
|-----------|------|---------|-------|-----------|------|----------|
| task | — | P（~13） | P | 0 | 0 | P（timeline） |
| project | P（TaskBoard） | — | P | 0 | 0 | 0 |
| space | 0 | 0 | — | 0 | 0 | 0 |
| lifecycle | P | P | P | — | 0 | 0 |
| view | 0 | P（editor） | 0 | 0 | — | 0 |
| activity | 0 | 0 | 0 | 0 | 0 | — |

`P` = 实现/import 依赖。

---

## 2. FE-F-TASK · `features/task`（79 files）

### A. 身份卡

| 字段 | 内容 |
|------|------|
| 标签 | domain · **产品内核** |
| 一句话 | 任务实体全栈：列表 board、创建、详情页/抽屉/预览、链接、快捷键、Query/Mutation |
| 不负责 | 全局命令注册本体、批量 runtime 本体、shell chrome |
| 壳厚度 | thick-feature（内含 detail 子系统） |
| Delete | **1**（删 task ≈ 删应用） |

### B. 结构卡

```txt
task/
  api/          tasks.ts, taskLinks.ts (+tests)     ← invoke facade
  query/        keys, queries, mutations, useTaskData, index.ts
  model/        placement, priority, status, boardOrder, selection, list/selection controllers
  ui/           TaskBoard, RowAdapter, ContextMenu, CreateContent, meta…
  shortcuts/    TaskRowShortcutScope, bindings, rowTargetResolver
  detail/       子系统（页/抽屉/预览）
    model/      draft, autosave, preview provider/controller, links, detail controller
    ui/         TaskPage*, TaskDrawer*, TaskPreview, sections…
    index.ts    对外导出 detail 公共面
```

**推荐分层符合度：** 高（api/query/model/ui 清晰）；detail 是合理的 **子域分包**，不是乱堆。

### C. 行为卡

| 维度 | 记录 |
|------|------|
| Server state | `taskKeys`：list / detail / links；mutations：create/update/archive/restore/delete… |
| Client state | list pending id；detail draft；**TaskPreviewProvider**（壳级装配）；selection 经 platform selection |
| IPC（api） | `list_tasks`, `get_task_detail`, `create_task`, `update_task`, `archive_task`, `restore_task`, `delete_task`；links：`list/create/update/delete_task_link` |
| URL | 详情页 route；抽屉经 entity-detail search；预览非 URL |
| 测试 | api/model/ui/detail/shortcuts 覆盖面大 |

### D. 依赖卡

**上游：** shared/types；metadata-fields；platform selection/bulk/danger（经 UI）；activity（timeline）；project/space（归属与展示）  

**下游（高）：** scene 页 inbox/all-tasks/no-project/views；project 页任务板；ShellLayout（Create/Preview）；EntityScene TaskBoardAdapter；bulk task adapter；route detail helpers；routeMemory 校验；command 菜单视觉；filter；quick-create；entity-detail host  

**公开 API 建议面：**  
- `api/*`、`query/*`、`model/taskPriority|taskStatus|taskPlacement`  
- `ui/TaskBoard`、`TaskCreateContent`  
- `detail` 的 index 导出（Page/Drawer/Preview/Provider）  
- `shortcuts/TaskRowShortcutScope`  

**私有：** detail 内部 section 组件、timeline model 细节（当前被外引用需核对）

### E. 质量卡

| 项 | 结果 | 证据 |
|----|------|------|
| invoke 仅在 api | **Pass** | |
| Query 管服务器状态 | **Pass** | |
| 列表动作收口 | **Pass** | `useTaskListController` |
| 体积/内聚 | **Partial** | 79 files；detail 三形态必要但重 |
| barrel | **Partial** | query/detail/shortcuts index |
| 跨域 | **Partial** | 强依赖 project/space（产品必然） |

### F. 结论

- **评级：Debt–Acceptable**（架构方向对；体量与 detail/壳预览耦合是演进成本）  
- **风险：** ① 任何列表页都绑 TaskBoard 契约 ② Preview 在 task 域但 Provider 挂 Shell ③ detail 与 entity-detail 双通道（页 vs 抽屉）  
- **建议：Keep**；To-Be 可把 `detail` 标为正式子包边界；列表契约稳定化  
- **可删除性：** 内核，Delete 1 正常  

---

## 3. FE-F-PROJECT · `features/project`（18 files）

### A–F 摘要

| 字段 | 内容 |
|------|------|
| 职责 | 项目 overview/sidebar/detail CRUD；ProjectBoard/Row；创建表单；**项目内任务板** `ProjectTaskBoard` |
| 结构 | `api/projects.ts` · `query/*` · `model/types.ts` · `ui/*` |
| IPC | `list_project_overview`, `list_sidebar_projects`, `get_project_detail`, `create/update_project`, `complete/reopen/archive/restore/delete_project` |
| Query keys | `projectKeys.overview/sidebar/detail` |
| 上游 | shared；task（任务板）；space（偶发） |
| 下游 | **~40 文件** — routes、Shell、overview scene、task 归属、bulk、filter、breadcrumb、routeMemory… |
| Delete | **1–2** |
| 评级 | **Acceptable** |
| 质量 | 结构干净 **Pass**；类型在 feature model 而非全走 shared **Partial**；入度高属 true-domain |
| 建议 | Keep |
| 与 scene | `project-overview` 页消费 list UI；`ProjectPage` 是域内页面组件由 route 挂载 |

---

## 4. FE-F-SPACE · `features/space`（10 files）

### A–F 摘要

| 字段 | 内容 |
|------|------|
| 职责 | 可见 Space 列表 CRUD/默认/归档；编辑对话框；视觉 token；**活跃 scope 同步**；**pending command open 取走** |
| 结构 | `api/spaces.ts` · `query/*` · `model/spaceVisuals.ts` · `ui/SpaceEditorDialog*` |
| IPC | `list_visible_spaces`, `create/update_space`, `set_default_space`, `archive/restore/delete_space`, **`set_active_scope`**, **`take_pending_command_open_intent`** |
| Query keys | `spaceKeys.visible()` |
| 下游 | 启动 index loader、ShellRouteLayout、ShellSidebar、几乎所有 scope 页、task/project 详情 |
| Delete | **1** |
| 评级 | **Acceptable** |
| **债 DOM-D1：** `setActiveScope` / `takePendingCommandOpenIntent` 更像 **shell/command 平台契约** 塞在 space api — 分层略脏但仍可理解（scope 属 space 运行时） |
| 建议 | Keep；To-Be 可把 pending command open 挪到 command/platform |

---

## 5. FE-F-LIFECYCLE · `features/lifecycle`（13 files）

### A–F 摘要

| 字段 | 内容 |
|------|------|
| 职责 | 归档/回收站 **列表** 与 **生命周期操作编排**（restore/delete/permanent） |
| 结构 | `api/lifecycle.ts` · `query/*` · `ui` LifecycleList/Board/Row/ContextMenu |
| IPC | `list_archive_entries` / `list_trash_entries`；permanent delete 按实体类型 invoke；restore/delete **转调** task/project/space api |
| Query keys | `lifecycleKeys.list(mode, scope, filter)` |
| 上游 | **task + project + space api**（编排） |
| 下游 | archive/trash **scene 页**；EntityScene LifecycleBoardAdapter；bulk lifecycle adapter；Shell bulk 装配；nav badges |
| Delete | **3**（删则归档/回收站空心，领域实体仍在） |
| 评级 | **Acceptable** · 编排域模式 **正确** |
| 建议 | Keep；不要把 archive/trash 业务写回 task 内部 |

---

## 6. FE-F-VIEW · `features/view`（9 files）

### A–F 摘要

| 字段 | 内容 |
|------|------|
| 职责 | 自定义视图实体：list/run/create/update/delete/reorder/toggle；编辑对话框；操作菜单 |
| 结构 | `api/views.ts` · `query/*` · `ui/ViewEditorDialog*` · `ViewActionsMenu` |
| IPC | `list_views`, `run_task_view`, `create/update/delete_view`, `toggle_view_visible`, `reorder_views` |
| Query keys | `viewKeys.list` · `viewKeys.taskRun` |
| 下游 | scene **`features/views`**（ViewsPage）；routes views/*；project-overview 偶发 |
| 与 `features/views` | **domain `view`** = 数据+编辑器；**scene `views`** = 列表/运行页壳（W5 标 thin/thick） |
| Delete | **3** |
| 评级 | **Acceptable** |
| 建议 | Keep；命名易混，注册表已区分 view vs views |

---

## 7. FE-F-ACTIVITY · `features/activity`（7 files）

### A–F 摘要

| 字段 | 内容 |
|------|------|
| 职责 | 实体活动时间线读取 + debug；Debug 页 UI |
| 结构 | `api/getEntityActivities.ts` · `query/*` · `ui/ActivityDebugPage` |
| IPC | `get_entity_activities` |
| Query keys | `activityKeys.entity(input)` |
| 下游 | task detail timeline（model/ui）；debug route 装配 |
| Delete | **3–4**（timeline 需改；debug 可单独删） |
| 评级 | **Acceptable** |
| 债 | Debug 页与生产 timeline 同 feature — 可接受；无写操作 |
| 建议 | Keep |

---

## 8. Query / IPC 速查（领域 · W4）

### 8.1 Query key 根

| 域 | root key | 主要形状 |
|----|----------|----------|
| task | `['tasks']` | list(input), detail(id), links(id) |
| project | `['projects']` | overview(scope,viewKey), sidebar(scope), detail(id) |
| space | `['spaces']` | visible() |
| lifecycle | `['lifecycle']` | list(mode, scope, filter) |
| view | `['views']` | list(entityType, visibleOnly), taskRun(input) |
| activity | `['activity']` | entity(request) |

失效总线：`workspace` + `shared/query/invalidation`（W3/W8）。

### 8.2 IPC 命令名（api facade）

| 域 | 命令（不完全表，以 api 文件为准） |
|----|----------------------------------|
| task | list_tasks, get_task_detail, create/update/archive/restore/delete_task；task_link CRUD |
| project | list_project_overview, list_sidebar_projects, get_project_detail, create/update/complete/reopen/archive/restore/delete_project |
| space | list_visible_spaces, create/update/set_default/archive/restore/delete_space, set_active_scope, take_pending_command_open_intent |
| lifecycle | list_archive_entries, list_trash_entries, permanently delete by entity… |
| view | list_views, run_task_view, create/update/delete_view, toggle_view_visible, reorder_views |
| activity | get_entity_activities |

完整表在 **W8** 与后端交叉前，以上为前端 As-Is 事实。

---

## 9. 领域与页面/壳的挂载关系

| 能力 | 挂载方式 |
|------|----------|
| Task 列表 board | scene 页组装 EntityScene → TaskBoardAdapter → `TaskBoard` |
| Task 详情页 | route `tasks/$taskId` → `TaskPage` |
| Task 抽屉 | entity-detail host → `TaskDrawer` |
| Task 预览 | Shell `TaskPreviewProvider` + ShellMain |
| Task 创建 | Shell CreateDialog → `TaskCreateContent` |
| Project 详情 | route → `ProjectPage`（含 ProjectTaskBoard） |
| Project overview 列表 | scene project-overview + ProjectBoard |
| Space 管理 | Sidebar CRUD + SpaceEditorDialog；settings general |
| Archive/Trash | scene 页 → LifecycleList |
| Views | scene ViewsPage + view api/query |
| Activity | Task 内 timeline；`/debug/activity` |

---

## 10. 质量债（进 Gap）

| ID | 项 | 严重度 |
|----|-----|--------|
| DOM-D1 | space api 含 shell/command 职责（active scope / pending open） | med |
| DOM-D2 | task 体积大 + detail 三形态维护成本 | med |
| DOM-D3 | project 类型双轨（feature model vs shared types）待 W8 澄清 | low–med |
| DOM-D4 | view vs views 命名易混 | low |
| DOM-D5 | domain→domain 调用（lifecycle 编排）需纪律：禁止反向页面乱 import 私有 ui | low |
| DOM-D6 | query `index.ts` barrel 普遍 | low |

**无 Critical 双真相源**（服务器状态仍以 Query 为主）。

---

## 11. 可删除性对照

| 删除目标 | 现实 |
|----------|------|
| task / project / space | 产品内核，Delete 1 预期 |
| lifecycle | 可删归档体验，实体仍在；scene archive/trash 需改 |
| view | 可删自定义视图；硬编码列表页可存活 |
| activity | 可删时间线/debug；详情变瘦 |
| **scene 页 only** | 应达到 Delete 4–5（W5 验证）— 逻辑应留在 domain |

W4 对理想架构的贡献：**domain 应保持「可被多 scene 复用」**；scene 变瘦才能满足「删 scene 几乎不影响」。

---

## 12. 子系统评级汇总

| ID | 评级 | Delete | 动作 |
|----|------|--------|------|
| FE-F-TASK | Debt–Acceptable | 1 | Keep |
| FE-F-PROJECT | Acceptable | 1–2 | Keep |
| FE-F-SPACE | Acceptable | 1 | Keep；整理 api 边界 |
| FE-F-LIFECYCLE | Acceptable | 3 | Keep |
| FE-F-VIEW | Acceptable | 3 | Keep |
| FE-F-ACTIVITY | Acceptable | 3–4 | Keep |

---

## 13. W4 未覆盖 → 后续

- 每个 mutation 的 invalidate 细节 → W8  
- TaskBoard props 全表面 API 文档 → 过细，To-Be 再锁  
- scene 页如何组合 domain → **W5**  
- project-overview / all-tasks 是否「假 domain」→ W5  

---

## 14. Session 收口

- W4 完成：6 领域 feature 结构/IPC/Query/依赖/评级  
- 内核：task/project/space；编排：lifecycle；卫星：view/activity  
- **下一 Wave：W5** 场景/页面 features（含 thin-shell 与 quick-create/settings）  
