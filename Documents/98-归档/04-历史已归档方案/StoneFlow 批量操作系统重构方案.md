# StoneFlow 批量操作系统重构方案

> 版本：v2
> 作用：记录批量操作系统 Phase 1-6 的落地结果和最终架构边界
> 适用范围：`src/features/bulk-action`、`src/features/selection`、任务页、项目总览、归档页、回收站、Command Menu 批量分组
> 架构文档：`src/features/bulk-action/ARCHITECTURE.md`
> 当前阶段：已落地并完成收口
> 最后校对：2026-05-18

---

## 0. 结论

批量操作已经从散落在页面、Shell、Command Menu 和 shared UI 的局部逻辑，收口为独立 feature：

```txt
src/features/bulk-action/
```

当前统一链路是：

```txt
当前 selection
-> BulkSelectionSnapshot
-> BulkActionRegistry / BulkActionRuntime
-> BulkActionProvider 确认与执行
-> task / project / lifecycle adapter
-> BulkActionResult
-> 统一 toast 与 selection 清理
```

任务、项目总览、归档页、回收站都使用同一套 bulk runtime。Command Menu 仍负责命令入口和分组，bulk-action 负责批量业务编排。

---

## 1. 已完成阶段

### Phase 1：任务批量动作核心

已完成：

1. 新增 `features/bulk-action/core`、`actions`、`adapters`、`runtime`、`ui`；
2. 接入 `task.completeSelected`、`task.archiveSelected`、`task.deleteSelected`；
3. Shell 通过 `BulkActionProvider` 注册 task actions 和 adapter；
4. 批量归档、删除成功后清空 selection，部分失败保留 selection；
5. 任务底部批量条和 Command Menu 批量命令走统一 runner。

### Phase 2：任务属性批量更新

已完成：

1. 接入 `task.setPrioritySelected`、`task.setStatusSelected`、`task.setDateSelected`；
2. Row shortcut 和 scoped picker 使用同一 bulk runner；
3. 批量属性更新不再在 Row 层手写 `Promise.all`。

### Phase 3：通用选择基座

已完成：

1. 抽出 `features/selection/model/useEntitySelection`；
2. 支持 selected ids、focus、anchor、range select、move focus、clear；
3. task 包装层保留任务语义，project/lifecycle 直接使用通用实体选择；
4. Esc 清空统一为 `useEntitySelectionEscape`。

### Phase 4：Row 快捷键统一

已完成：

1. 新增 `EntityRowShortcutScope`；
2. task/lifecycle/project row 接入同一套 hover/focus/Shift range/Esc 清空模型；
3. 选择框显示规则对齐任务页。

### Phase 5：归档页与回收站批量操作

已完成：

1. 生命周期页使用 `lifecycle.restoreSelected`、`lifecycle.deleteSelected`、`lifecycle.deletePermanentlySelected`；
2. 归档页批量条显示“恢复 / 删除”；
3. 回收站批量条显示“恢复 / 永久删除”；
4. `lifecycle.deleteSelected` 表示移入回收站；
5. `lifecycle.deletePermanentlySelected` 必须二次确认；
6. 生命周期页允许混选 `space/project/task`，由 lifecycle adapter 按条目执行。

### Phase 6：项目总览批量操作

已完成：

1. 项目总览使用 `project.archiveSelected`、`project.deleteSelected`；
2. `deleteSelected` 表示移入回收站，不是永久删除；
3. 项目 selection 注册到 Command Selection；
4. Command Menu 在 project selection 下显示“归档项目 / 删除项目”；
5. 项目总览底部批量条显示“归档 / 删除”。

---

## 2. 最终收口结果

### 2.1 目录归位

最终结构以 `src/features/bulk-action/ARCHITECTURE.md` 为准：

```txt
src/features/bulk-action/
├── ARCHITECTURE.md
├── actions/
├── adapters/
├── core/
├── runtime/
├── selection/
└── ui/
```

`BulkActionBar`、`BulkActionConfirmDialog`、`BulkCommandMenuAction` 都归属 `features/bulk-action/ui`。

### 2.2 删除兼容层

已去掉这些旧入口：

```txt
src/shared/ui/bulk-action-bar.tsx
src/shared/ui/board/useSectionSelection.ts
src/features/command/ui/BulkCommandMenuAction.tsx
src/features/task/shortcuts/useTaskSelectionEscape.ts
```

不保留 re-export 兼容层。业务代码必须直接引用真实 feature。

### 2.3 Shell 收敛

Shell 只保留统一 command bulk runner：

```txt
CommandSelectionContext
-> createCommandBulkSelectionSnapshot
-> runBulkAction
-> shouldClearBulkSelection
-> showBulkActionResultToast
```

不再按 task/project/lifecycle 各写一套 runner。

### 2.4 页面收敛

生命周期页和项目总览页不再本地手写 snapshot/result 处理，统一使用 bulk-action helper：

```txt
createLifecycleBulkSelectionSnapshot
createProjectBulkSelectionSnapshotFromProjects
shouldClearBulkSelection
showBulkActionResultToast
```

任务页继续通过 Command Menu 批量入口调用 Shell 统一 runner。

---

## 3. 当前动作清单

```txt
task.completeSelected
task.archiveSelected
task.deleteSelected
task.setPrioritySelected
task.setStatusSelected
task.setDateSelected
lifecycle.restoreSelected
lifecycle.deleteSelected
lifecycle.deletePermanentlySelected
project.archiveSelected
project.deleteSelected
```

动作 id 是产品语义，不是按钮文案或快捷键名称。

---

## 4. 长期边界

禁止：

1. 在 `shared/ui` 新增 bulk-action 兼容 re-export；
2. 在 `features/command/ui` 持有 bulk UI；
3. 让 task 命名的 selection hook 被 project/lifecycle 复用；
4. 在页面里手写 `createProjectSnapshot`、`createLifecycleSnapshot`；
5. 在 Shell 里为每个实体复制一套批量 result switch；
6. 在 action 里直接 import store 或 toast；
7. 在 adapter 里每个 id 都刷新一次 store；
8. 为未落地实体提前写空 action。

允许：

1. Command Menu 继续负责批量命令入口；
2. Row shortcut 继续负责 row scope 判断；
3. bulk-action 只负责批量业务编排；
4. selection feature 继续负责跨实体选择状态。

---

## 5. 回归验证

常规回归：

```bash
bun run test:run src/features/bulk-action src/features/task/shortcuts src/features/lifecycle src/features/project src/features/project-overview src/features/command src/features/selection
bun run test:run src/features/inbox src/features/all-tasks src/features/no-project src/features/views
bun run typecheck
```

架构搜索验收：

```bash
rg "features/command/ui.*BulkCommandMenuAction|shared/ui/bulk-action-bar|shared/ui/board/useSectionSelection|useTaskSelectionEscape" src
rg "createLifecycleSnapshot|createProjectSnapshot|runLifecycleBulkActionFromCommand|runProjectBulkActionFromCommand|runTaskBulkActionFromCommand" src
```

第一条只能出现 `features/bulk-action` 下的新 `BulkCommandMenuAction` 使用事实；第二条不应出现旧重复实现。
