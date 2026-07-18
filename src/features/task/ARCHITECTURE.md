# task · 任务域

> 作用：描述 **当前已落地** 的 `src/features/task` 边界  
> 最后更新：2026-07-17

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
├── api/
├── hooks/                   # Query · useTaskListScene · useTaskPageFilterController
├── model/                   # priority/status/placement · selection · open 策略
├── create/                  # 创建表单内核
├── bulk/                    # 批量动作 + adapter
├── commands/                # registerTaskCommands · 行快捷键共用 bulk
├── components/
├── detail/                  # 详情子树（外层不 import detail/）
└── shortcuts/
```

---

## 3. Public 要点（节选）

| 类 | 示例 |
|----|------|
| 列表 | `TaskListSceneView` · `useTaskListScene` · `TaskBoard` |
| 创建 | `TaskCreateContent` · `taskCreateSchema` · `toTaskCreateInput` |
| 打开策略 | `resolveCommandOpenTargetPath` · `resolveShellDetailState` |
| 筛选 | `useTaskPageFilterController` |
| 命令选中 | `buildTaskCommandSelection` |
| placement | `TaskPlacementTarget` · `buildTaskPlacementGroups` · `./contract` |
| 批量 | `taskBulkActions` · `createTaskBulkAdapter` |
| 命令 handlers | `registerTaskCommands` · `runTaskRowBulkCommand` |
| 图标注册 | `registerTaskMetadataIcons`（壳装配根调用一次） |
| 详情 | `TaskPage` · `TaskDrawer` · `TaskPreview` |

新增导出前确认已有外消费者；禁止预防性撑大 public。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| bulk-action | 引擎在 bulk-action；本域贡献 actions/adapter |
| command | 经 `registerTaskCommands` 注入 handlers |
| entity-scene | 列表页可挂 EntityScene；board 走 task public |
| shell-dialogs | 创建对话框状态在壳；本域只出表单内容 |
| metadata-fields | placement 归本域；status/priority 图标由本域注入 |

---

## 5. 变更纪律

改目录树或 public 表时更新本文件；`bun run check`。
