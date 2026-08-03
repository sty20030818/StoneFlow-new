# 任务查询与 Board 架构收口 - Tasks

## 当前阶段

实现完成，待热更新手工验收后归档。

## 阶段任务

### F3 — totalCount 语义

- [x] T1 `useTaskData.ts`：pages 未就绪 → `totalCount: undefined`；禁止 `?? 0`
  - _AC-1_
- [x] T2 `taskBoardModel.buildTaskBoardExtent`：`typeof totalCount === 'number'`（含 0）才占位
  - _AC-1_

### F2 — 筛选下推

- [x] T3 后端 `ListTasksInput` + `TaskListQuery`：priorities、date_filter；repository SQL
  - _AC-2_
- [x] T4 前端 `ListTasksInput` / `listTasks` / queryKey 含 priorities、dateFilter
  - _AC-2_
- [x] T5 `encodeListTasksDateFilter` + list/project 场景 filter 在 data 之上驱动 listInput；`serverDriven` 全覆盖
  - _AC-2_

### F4 — Board 减薄

- [x] T6 `useTaskBoardSticky.ts` 抽离；`TaskBoard` 消费 hook
  - _AC-5_

### F1 — View 收口

- [x] T7 View 保持与 list 同形 `{ items, totalCount, nextCursor }` + infinite；SQL 候选 + 复杂语义内存窗口（≤2k）写清注释
  - _AC-3, AC-4_（见偏差）

### 收尾

- [x] T8 归档 perf 任务；本目录 SPEC/PLAN/TASKS
- [x] T9 typecheck + cargo lib tests + 相关 vitest

## 阻塞

无。

## 与 SPEC/PLAN 的实施偏差

1. **F1 未做到「所有 View 全 SQL keyset」**：自定义 sort/group、system 本地日、多日期字段仍在 SQL 候选后内存滤排+切片。契约与 infinite 已与 list 对齐；全量 SQL 统一 executor 需单独评估 sort keyset，不在本轮硬做以免错分页。
2. **collection 在 externalFilter 时仍会创建内部 filter hook 占位**（Rules of Hooks）；仅外部 controller 注册到 UI。

## 完成记录

- 旧任务已归档：`98-归档/02-已完成重构/2026-07-31-task-board-perf-query-unify`
- 新任务：`02-开发任务/2026-08-03-task-query-board-closeout`
