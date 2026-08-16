# task · 任务域

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-08-16

---

## 1. 心智

```txt
列表薄页 / project / view
  → TaskListSceneView | useTaskListScene
  → useTaskCollectionScene（展示 / 选择 / 预览 / 批量 / Board 接线）
  → TaskBoard + filter / display / selection / preview

详情
  → TaskPage | TaskDetailContent | TaskPreview（detail/）
  → Sheet / Aside 容器选择与显式完整页导航由 entity-detail 拥有

创建
  → 壳 Overlays 挂 TaskCreateContent
  → create/taskCreateForm（schema · 默认值 · toCreateInput）

打开策略
  → model/taskOpenStrategy（命令 open path · 壳 detail 判定）

批量 / 命令
  → bulk/（动作定义 + adapter）
  → commands/registerTaskCommands · runTaskRowBulkCommand
```

跨模块只使用稳定入口：完整 facade 走 `@/features/task`，placement 纯契约走 `@/features/task/contract`，文案与指示器走 `@/features/task/presentation`。
**禁止** `features/task` → `@/layout/**`。

---

## 2. 目录结构（定稿）

```txt
src/features/task/
├── ARCHITECTURE.md
├── index.ts                 # 主 public
├── contract.ts              # placement 窄契约（避主 barrel 环）
├── presentation.ts          # 文案与纯展示指示器窄契约
├── api/                     # IO only（唯一 invoke）
├── hooks/
│   ├── task.keys|queries|mutations
	│   ├── useTaskListController · useTaskSelection · useTaskData · filter
	│   ├── useTaskCollectionScene.ts # 任务集合的唯一交互编排
	│   ├── useTaskListScene.ts  # all / standalone 数据源与页面差异
	│   └── list-scene/          # variant 配置
├── model/                   # 纯规则 + indicators（无 React hook）
├── create/                  # 创建表单内核
├── bulk/                    # 批量动作 + adapter
├── commands/                # registerTaskCommands · runTaskRowBulkCommand
├── components/              # Board · Row · Create · ListSceneView · ContextMenu(+helpers/items)
├── detail/                  # 详情子树；preview = Provider 壳 + store/helpers/register
└── shortcuts/               # Scope 壳 + controller/navigation/runtime/scroll/guards
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 列表 | `TaskListSceneView` · `TaskBoard` · `useTaskCollectionScene` |
| 创建 | `TaskCreateContent` · `taskCreateSchema` · `toTaskCreateInput` |
| 打开策略 | `resolveCommandOpenTargetPath` · `resolveShellDetailState` |
| 筛选 | `useTaskPageFilterController` |
| 命令选中 | `buildTaskCommandSelection` |
| placement | 类型 + `buildTaskPlacementGroups` · `./contract` |
| 展示 | status / priority 文案与指示器 · `./presentation` |
| 批量 | `taskBulkActions` · `createTaskBulkAdapter` |
| 命令 | `registerTaskCommands`（行快捷键包内调 handlers） |
| 详情 | `TaskPage` · `TaskDetailContent` · `TaskPreview` · Preview Provider/controller |
| 列表编排 | `useTaskListController` · `useTaskSelection` · `useTaskListData` / Query |
| 展示 | `PriorityIcon` · `TaskStatusIndicator` · 标签 formatters |
| IO | `getTaskDetail` · `createTask` · `deleteTask` · `restoreTask` 等（仅已有外消费者） |

新增导出前确认已有外消费者；禁止预防性撑大 public。导出须符合 CONVENTIONS TSDoc L1。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| bulk-action | 引擎在 bulk-action；本域贡献 actions/adapter |
| command | 经 `registerTaskCommands` 注入 handlers |
| page-frame | 列表页组合纯页面框架；Board 走本域 public |
| shell-dialogs | 创建对话框状态在壳；本域只出表单内容 |
| metadata-fields | placement 归本域；status/priority 图标由本域注入 |
| launcher | 创建内核 / 标签 formatters 复用本域 public |
| navigation | 命令的 path-only open 策略在本域；列表详情的 Sheet / Aside 容器选择与 canonical 显式导航由 `entity-detail` 拥有 |

任务正式详情合同：`Space` 只打开只读 Peek；列表点击或 `Enter` 只写入共享 `?task=` 详情意图。窗口 `<1024px` 时详情始终使用 HeroUI Sheet，`>=1024px` 时始终使用非模态 Aside；跨断点只换容器，不改 URL、不关闭、不跳 `TaskPage`。Aside 与 Sheet 复用同一任务详情 query、draft、autosave 和 mutation；Aside 列表 Panel 最小 `352px`，Aside 最小 `320px` / 默认 `360px` / 最大 `440px`。`TaskBoard` 只以自身容器宽度保留一档 `<560px` 紧凑布局，不与窗口或 Sidebar 状态耦合。canonical `TaskPage` 只能由 Header 等显式用户动作在 flush autosave 后打开。任务域不拥有详情呈现偏好、断点 state 或容器分流逻辑。

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`。
