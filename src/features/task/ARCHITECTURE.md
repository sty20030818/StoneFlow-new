# task · 任务域

> 作用：描述 **当前已落地** 的 `src/features/task` 边界（日常改码入口）
> 最后更新：2026-07-18
> 决议档案：[M-F-TASK](../../../Documents/03-前端架构解析/05-模块治理/模块/M-F-TASK.md)
> 实现债刀序：[11-Task样板重构执行计划](../../../Documents/03-前端架构解析/05-模块治理/11-Task样板重构执行计划.md)
> 写法：[`CONVENTIONS.md`](../../CONVENTIONS.md)

---

## 1. 当前真实心智

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

## 2. 目录结构

```txt
src/features/task/
├── ARCHITECTURE.md
├── index.ts                 # 主 public
├── contract.ts              # placement 类型/纯函数（避免主 barrel 环）
├── api/                     # IO only
├── hooks/                   # Query · useTaskListScene · filter controller
├── model/                   # 纯规则为主；仍有少量 use* 待迁 hooks/（见债表）
├── create/                  # 创建表单内核
├── bulk/                    # 批量动作 + adapter
├── commands/                # registerTaskCommands · 行快捷键共用 bulk
├── components/
├── detail/                  # 详情子树（外层不 import detail/）
└── shortcuts/               # TaskRowShortcutScope（巨石 · 待拆）
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

新增导出前确认已有外消费者；禁止预防性撑大 public。导出须有 JSDoc（CONVENTIONS L1）。

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

## 5. 实现债（样板重构）

| 债 | 阶段（见执行计划） |
|----|-------------------|
| Query / JSDoc / public 对齐 CONVENTIONS | 1 NORM |
| `model/` 内 React hooks 迁 `hooks/`；list-scene 内拆 | 2 HOOKS |
| `TaskRowShortcutScope` ~873 拆文件 | 3 SHORTCUT |
| PreviewProvider / ContextMenu（Board 可选） | 4 VOLUME |

**目标形态不变：** 单 feature · 唯一 list-scene facade · 禁 → layout。

---

## 6. 变更纪律

改目录树或 public 表时更新本文件与执行计划进度；`bun run check`。
