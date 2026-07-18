# task · 任务域

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-07-19

---

## 1. 心智

```txt
列表薄页 / project / view
  → TaskListSceneView | useTaskListScene
  → TaskBoard + filter / display / selection / preview

详情
  → TaskPage | TaskDrawer | TaskPreview（detail/）

创建
  → 壳 Overlays 挂 TaskCreateContent
  → create/taskCreateForm（schema · 默认值 · toCreateInput）

打开策略
  → model/taskOpenStrategy（命令 open path · 壳 detail 判定）

批量 / 命令
  → bulk/（动作定义 + adapter）
  → commands/registerTaskCommands · runTaskRowBulkCommand
```

跨模块 **只** `import { … } from '@/features/task'`（placement 窄契约可用 `@/features/task/contract`）。
**禁止** `features/task` → `@/layout/**`。

---

## 2. 目录结构（定稿）

```txt
src/features/task/
├── ARCHITECTURE.md
├── index.ts                 # 主 public
├── contract.ts              # placement 类型/纯函数（避免主 barrel 环）
├── api/                     # IO only
├── hooks/                   # Query · list-scene · filter · 列表编排 hooks
│   └── list-scene/          # variantConfig · filter/display · selection · board
├── model/                   # 纯规则（无 React hook）
├── create/                  # 创建表单内核
├── bulk/                    # 批量动作 + adapter
├── commands/                # registerTaskCommands · 行快捷键共用 bulk
├── components/              # 列表场景 UI
├── detail/                  # 详情子树；preview = Provider 壳 + store/helpers/register
├── components/              # 列表 UI；ContextMenu = 主拼装 + helpers/items/metadata
└── shortcuts/               # TaskRowShortcutScope 壳 + navigation/runtime/scroll/guards
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 列表 | `TaskListSceneView` · `TaskBoard`（`useTaskListScene` 厚页可直接用） |
| 创建 | `TaskCreateContent` · `taskCreateSchema` · `toTaskCreateInput` |
| 打开策略 | `resolveCommandOpenTargetPath` · `resolveShellDetailState` |
| 筛选 | `useTaskPageFilterController` |
| 命令选中 | `buildTaskCommandSelection` |
| placement | 类型 + `buildTaskPlacementGroups` · `./contract` |
| 批量 | `taskBulkActions` · `createTaskBulkAdapter` |
| 命令 | `registerTaskCommands`（行快捷键在包内调 handlers，不经 barrel 撑大） |
| 详情 | `TaskPage` · `TaskDrawer` · `TaskPreview` · Preview Provider/controller |
| 展示 | `PriorityIcon` · `TaskStatusIndicator` · 标签 formatters |
| IO | `getTaskDetail` · `createTask` · `deleteTask` · `restoreTask` · `useTaskListQuery` 等（仅已有外消费者） |

新增导出前确认已有外消费者；禁止预防性撑大 public。导出须符合 CONVENTIONS TSDoc L1。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| bulk-action | 引擎在 bulk-action；本域贡献 actions/adapter |
| command | 经 `registerTaskCommands` 注入 handlers |
| entity-scene | 列表页挂 EntityScene；board 走本域 public |
| shell-dialogs | 创建对话框状态在壳；本域只出表单内容 |
| metadata-fields | placement 归本域；status/priority 图标由本域注入 |
| launcher | 创建内核 / 标签 formatters 复用本域 public |
| navigation | 换页只 path-only intent；open 策略在本域 |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`。
