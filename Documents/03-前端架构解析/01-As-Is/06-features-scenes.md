# As-Is · 06 Features · 页面 / 场景

> 状态：**W5 深挖完成**（2026-07-15）  
> 范围：场景/页面 feature（含独立窗、设置、列表壳、空壳）  
> 决策 4=C：先登记壳厚度，**不急合并**；本分册给出厚度判定与删除/合并倾向（备注级，不定案）

---

## 0. 章结论速览

| ID | 路径 | 文件数 | LOC 页主文件 | 壳厚度 | Delete | 评级 | 建议 |
|----|------|--------|--------------|--------|--------|------|------|
| FE-F-QC | `quick-create` | 47+ARCH | 整窗 feature | **thick-feature** | 3–4 | **Optimal–Acceptable** | Keep |
| FE-F-SETTINGS | `settings` | 13 | 85 | **mixed** | 2 | Acceptable | Keep |
| FE-F-VIEWS | `views` | 2 | 386 | **thick-scene** | 4 | Acceptable | Keep |
| FE-F-PROJ-OV | `project-overview` | 4 | 244 | **thick-scene** | 4 | Acceptable | Keep |
| FE-F-INBOX | `inbox` | 1 (+空 api/model) | 204 | **composition-shell** | **5** | Acceptable | Keep 或抽共享 list 编排 |
| FE-F-ALL-TASKS | `all-tasks` | 1 | 237 | **composition-shell** | **5** | Acceptable | 同上 |
| FE-F-NO-PROJECT | `no-project` | 1 | 222 | **composition-shell** | **5** | Acceptable | 同上 |
| FE-F-ARCHIVE | `archive` | 1 | **7** | **ultra-thin** | **5** | Optimal | Keep 或内联 route |
| FE-F-TRASH | `trash` | 1 (+空 api/model) | **7** | **ultra-thin** | **5** | Optimal | Keep 或内联 route |
| FE-F-TASK-DRAWER | `task-drawer` | **0** | — | **empty** | **5** | **Debt** | **Delete 空目录** |

### 场景层总判断

1. **可删除性最好的一层：** 多数 scene 外部消费者 = **仅 route 叶子**（Delete 4–5），符合决策 2=A 的理想形态。  
2. **例外：** `settings` 被 navigation + shell sidebar 大量引用（Delete 2）。  
3. **「单文件 feature」并不都 thin：**  
   - archive/trash = **真 ultra-thin**（一行 LifecycleList）  
   - inbox / all-tasks / no-project = **composition-shell**：无独立 api，但 200+ 行装配 domain/platform  
4. **最大场景债：** 三个任务列表页 **高度同构复制**（filter/display/selection/bulk/EntityScene 模板）。  
5. **空壳：** `task-drawer` 与 inbox/trash 的空 `api/`/`model/` 目录应删；真抽屉在 `task/detail`。  
6. **Quick Create** 是独立窗口的 **最优模块化样板**（runtime/domain/layout/shell/ui 分离 + 自有 ARCHITECTURE.md）。

---

## 1. 壳厚度判定（本章定稿）

| 厚度 | 定义 | 本仓库实例 |
|------|------|------------|
| `empty` | 无实现文件 | `task-drawer` |
| `ultra-thin` | ≤20 行，纯转发 domain UI | `archive`, `trash` |
| `composition-shell` | 单页组装 domain+platform，**无自有 api/query** | `inbox`, `all-tasks`, `no-project` |
| `thick-scene` | 页内含较多场景状态/多域编排，仍无独立实体 api | `views`, `project-overview` |
| `mixed` | 页壳 + 被壳/导航复用的 model/api | `settings` |
| `thick-feature` | 自有 runtime/domain/api，可独立生命周期 | `quick-create` |

> 旧标签 `thin-shell` 拆成 `ultra-thin` 与 `composition-shell`，避免「1 文件 = 可删一行」的误判。

---

## 2. Scene ↔ Route 矩阵（核实）

| Scene | all route | spaces route | 页面组件 |
|-------|-----------|--------------|----------|
| quick-create | — | — | `routes/quick-create.tsx` → `QuickCreatePage`（独立窗） |
| settings | `all/settings/*` | `spaces/.../settings/*` + legacy `/settings` | `SettingsPage` |
| inbox | `all/inbox` | `spaces/.../inbox` | `InboxPage` |
| all-tasks | `all/tasks/` | `spaces/.../tasks/` | `AllTasksPage`（两边共用） |
| no-project | `all/no-project` | 对称 | `NoProjectPage` |
| archive | `all/archive` | 对称 | `ArchivePage` |
| trash | `all/trash` | 对称 | `TrashPage` |
| views | `all/views/` + `$viewId` | 对称 | `ViewsPage` |
| project-overview | `all/projects/` | 对称 | `ProjectOverviewPage` |
| project detail | route → **domain** `ProjectPage` | 对称 | 不在 scene 目录 |
| task detail | — | `tasks/$taskId` → **domain** `TaskPage` | 不在 scene 目录 |

---

## 3. FE-F-QC · `features/quick-create`（47 files）

### A. 身份

| 字段 | 内容 |
|------|------|
| 形态 | **独立 Tauri 窗口**，非 shell 内页 |
| 职责 | 全局快捷捕获：session、搜索、创建任务、布局测量/present |
| 不负责 | 主壳导航、主窗 Query 工作区列表 |
| 消费者 | **仅** `routes/quick-create.tsx` |
| Delete | **3–4**（主应用仍可运行；失去全局捕获窗） |

### B. 结构（与自有 ARCHITECTURE.md 一致 ✅）

```txt
quick-create/
  api/          invoke：initial state / layout / present / search / create / open…
  runtime/      session phase、事件桥、reducer
  domain/       编辑态、搜索、提交、派生状态（多 hook + provider）
  layout/       测量高度、resize、presenter
  shell/        QuickCreateWindowShell 跨层装配
  ui/           表面与 controls/adapters
  model/        纯类型与 formatter
  ARCHITECTURE.md
```

入口：

```txt
QuickCreatePage
  → SessionProvider → DomainProvider → WindowShell
```

### C–F 摘要

| 项 | 结论 |
|----|------|
| IPC | 独立 `quick_create_*` 命令族（api/quickCreate.ts） |
| 分层 | **Pass** — 禁止揉回单 provider（短契约） |
| 依赖 domain | task/project/space 展示与创建语义（controls/adapters） |
| 评级 | **Optimal–Acceptable** |
| 建议 | **Keep** · 平台可删除性标杆（窗口级） |
| 债 | 体积大；与主窗 task 创建路径双轨（产品必要） |

---

## 4. FE-F-SETTINGS · `features/settings`（13 files）

### A–F 摘要

| 字段 | 内容 |
|------|------|
| 结构 | `model/settingsSection` · `lastSettingsSection` · `api/sidebarSettings` · `ui/SettingsPage` + panels |
| 分区 | `general` / `sidebar` / `sync` / `update` |
| 页壳 | EntityScene + panel switch；写 last section |
| **为何 mixed** | section keys / last section / sidebarSettings api 被 **navigation + ShellSidebar 设置** 广泛 import（~20 文件） |
| 下游 | routes settings*；intents/routePaths/shellRoute；useSidebarSettingsStore；SettingsSidebar… |
| Delete | **2** |
| 评级 | Acceptable |
| 建议 | Keep；To-Be 可把「section 契约」与「设置页 UI」分文件边界但不急拆 feature |
| 面板 | General / Sidebar 偏好 / Sync（调 sync feature）/ Update（调 update feature） |

---

## 5. Ultra-thin · archive / trash

### ArchivePage / TrashPage

```tsx
// 实质
<LifecycleList mode='archive|trash' title='…' icon={…} />
```

| 项 | 结论 |
|----|------|
| 逻辑归属 | **100%** `features/lifecycle` |
| 空目录 | `trash/api`、`trash/model` 空；inbox 同构空目录 |
| 消费者 | 仅对称 route 各 2 |
| Delete | **5** — 删 feature 后 route 直接 import LifecycleList 即可 |
| 评级 | **Optimal**（薄到极致） |
| 合并倾向 | 可内联进 route 或 `lifecycle/ui/*Page`；**非必须**（对称 route 映射清晰有价值） |

---

## 6. Composition-shell · inbox / all-tasks / no-project

### 共同模式（三页几乎同构）

```txt
useCurrentShellRoute + resolveShellRouteScope
  → useTaskListData({ scope, viewKey, placement })
  → useTaskListController / useTaskSelection
  → useTaskDisplayOptions(pageKey)
  → useTaskPageFilterController + register filter
  → useRegisterCommandSelection + BulkActionBar
  → useEntityDetailController + TaskPreview source
  → EntityScene + Task board slot + MainCard.GhostAction 创建
```

| 页 | placement / 差异 | LOC |
|----|------------------|-----|
| inbox | `placement: inbox`；display key `task:inbox` | 204 |
| all-tasks | `placement: all`；status pills 含 noProject | 237 |
| no-project | `placement: noProject`；status pills | 222 |

| 项 | 结论 |
|----|------|
| 自有 api/query | **无** |
| 空目录 | `inbox/api`、`inbox/model` 空 |
| 消费者 | 仅 route（all + spaces 共用同页组件） |
| Delete | **5**（逻辑都在 domain/platform） |
| 评级 | Acceptable |
| **债 SCN-D1** | 三页复制粘贴编排 → DRY 失败；应抽 `TaskListScene` 类编排（To-Be），**不必**合并 feature 目录 |
| 建议 | Keep 目录对称；优先抽共享 composition hook/组件 |

---

## 7. Thick-scene · views / project-overview

### FE-F-VIEWS · `features/views`（ViewsPage ~386 LOC）

| 字段 | 内容 |
|------|------|
| 职责 | 自定义视图列表 + 选中 view 运行任务结果板 + 编辑器对话框 |
| 数据 | `features/view` query/mutations + task list controller |
| 与 domain `view` | 页在 `views`；实体 API 在 `view` — **正确分工** |
| 消费者 | 4 个 route（index + $viewId × 2 scope） |
| Delete | **4** |
| 评级 | Acceptable |
| 债 | 单文件偏大；视图管理与任务板耦合在一页（场景合理） |

### FE-F-PROJ-OV · `features/project-overview`（4 files）

| 字段 | 内容 |
|------|------|
| 职责 | 项目总览页：overview query、选择、bulk、EntityScene project board |
| 结构 | Page + List + EmptyState + test |
| 数据 | `project` query + bulk project + selection |
| 消费者 | projects index routes ×2 |
| Delete | **4** |
| 评级 | Acceptable |
| 与 domain | `ProjectPage` 仍在 `project/ui`（详情）；overview 在 scene — 边界可接受 |

---

## 8. FE-F-TASK-DRAWER · empty

| 字段 | 内容 |
|------|------|
| 内容 | 仅空目录 `api/`、`model/`，**0 ts/tsx** |
| 真实现 | `features/task/detail/ui/TaskDrawer` + entity-detail host |
| 消费者 | **0** |
| Delete | **5** |
| 评级 | **Debt** |
| 建议 | **Migrate 波次 0：删除整个 `features/task-drawer/`** |
| 同步 | 删 `inbox/api`、`inbox/model`、`trash/api`、`trash/model` 空目录 |

---

## 9. 可删除性验证（决策 2=A · 场景层）

| 删除 scene | 改动面 | 是否接近理想 |
|------------|--------|--------------|
| archive/trash | 2 route 改 import | ✅ 几乎完美 |
| inbox/all-tasks/no-project | 2 route + 无其它 | ✅；可选保留抽公共编排 |
| views / project-overview | 2–4 route | ✅ |
| quick-create | 1 route + Tauri 窗配置 | ✅ 窗口级独立 |
| settings | route + **navigation/shell 多处** | ⚠️ 不完全是 scene |
| task-drawer 空目录 | 零引用直接删 | ✅ |

**结论：** 场景层整体 **最接近**「删 feature 只改 route」；settings 与列表 composition DRY 是主要例外/债。

---

## 10. 场景债清单（Gap）

| ID | 项 | 严重度 |
|----|-----|--------|
| SCN-D1 | inbox / all-tasks / no-project 编排复制 | **high**（维护） |
| SCN-D2 | 空目录 task-drawer + inbox/trash api/model | med（干净度） |
| SCN-D3 | ViewsPage 单文件 386 行 | low–med |
| SCN-D4 | settings 契约泄漏到 navigation（产品交叉，可接受） | low |
| SCN-D5 | ultra-thin feature 目录是否保留（风格问题） | low |

---

## 11. 与 W3/W4 的咬合

```txt
scene page
  → 读 ShellRoute / scope
  → domain query + list controllers
  → platform：selection / bulk / filter / display / entity-detail
  → EntityScene → BoardAdapter → domain Board
```

- 业务规则：**不在** ultra-thin / 理想 composition-shell  
- 现状 composition-shell **仍偏厚**（页面知道太多 wiring）→ To-Be 抽 `useTaskListSceneWiring` 之类  

---

## 12. 评级汇总表

| ID | 壳厚度 | Delete | 评级 | 动作 |
|----|--------|--------|------|------|
| FE-F-QC | thick-feature | 3–4 | Optimal–Acceptable | Keep |
| FE-F-SETTINGS | mixed | 2 | Acceptable | Keep |
| FE-F-VIEWS | thick-scene | 4 | Acceptable | Keep |
| FE-F-PROJ-OV | thick-scene | 4 | Acceptable | Keep |
| FE-F-INBOX | composition-shell | 5 | Acceptable | Keep + 抽共享编排 |
| FE-F-ALL-TASKS | composition-shell | 5 | Acceptable | 同上 |
| FE-F-NO-PROJECT | composition-shell | 5 | Acceptable | 同上 |
| FE-F-ARCHIVE | ultra-thin | 5 | Optimal | Keep / 可选内联 |
| FE-F-TRASH | ultra-thin | 5 | Optimal | Keep / 可选内联 |
| FE-F-TASK-DRAWER | empty | 5 | Debt | **Delete** |

---

## 13. W5 未覆盖

- 三列表页逐行 diff 抽公共 API 设计 → To-Be  
- Quick Create IPC 全命令表 → W8  
- settings sidebar api 与 shellDevicePreferences 交叉 → 已在 W2/W3  

---

## 14. Session 收口

- W5 完成：场景层可删除性验证通过（整体优）  
- 样板：QC 模块化；archive/trash 极薄  
- 债：列表页三份复制；空目录 task-drawer  
- **下一 Wave：W6** shared + styles + test  
