# 任务 Board 滚动手感与查询语义统一 - Tasks

## 当前阶段

实现完成，待发起人热更新手工验收后归档。

## 阶段任务

### Phase A — 验收方法（无产品代码）

- [x] T1 在本文件「完成记录」写入滚动 Profiler 手工清单
  - _对应验收标准：AC-1_

### Phase B — 行减重

- [x] T2 `getTaskPriorityMetadataDropdownProps` / `getTaskStatusMetadataDropdownProps` module 单例；`TaskRowAdapter.tsx` 消费单例
  - _对应验收标准：AC-4_
  - _测试：`TaskRowAdapter.test.tsx`_

- [x] T3 审计：`TaskContextMenu` 已仅 `menuOpen` 时挂 Content；无需改
  - _对应验收标准：AC-4_

### Phase C — sticky 纯 DOM

- [x] T4 `TaskBoard.tsx`：push 用 ref + rAF 写 transform；`stickyActiveIndex` / `stickyStuck` 变才 setState
  - _对应验收标准：AC-2, AC-3_
  - _测试：`TaskBoard.test.tsx`_

### Phase D — list 筛选下推

- [x] T5 `useTaskListScene`：standalone → placement；statuses 已有；`serverDrivenFilters: status/showCompleted/standalone`；`useTaskPageFilterController` 跳过已下推字段
  - _对应验收标准：AC-5, AC-7_

- [x] T6 priority/date **未** SQL 下推：见偏差；前端仍滤
  - _对应验收标准：AC-7_

### Phase E — View 窗口对齐

- [x] T7 View 保持 `run_task_view` 分页契约 + infinite；`serverDrivenFilters` status/showCompleted；系统复杂 date View 仍内存滤后切片（≤2k）
  - _对应验收标准：AC-6, AC-8_
  - _测试：`ViewsPage.test.tsx`_

### Phase 收尾

- [x] T8 同步 A2
- [x] T9 typecheck + 相关 vitest 通过

## 阻塞

无。

## 与 SPEC/PLAN 的实施偏差

1. **priority / date 未 SQL 下推**（AC-7）：仍由 `useTaskPageFilterController` 前端过滤；list 的 status/standalone/showCompleted 已下推。
2. **View 未改为「全部系统 View 走 list_tasks SQL keyset」**：维持 `run_task_view` 候选+切片窗口；打开侧对超大候选仍可能偏重，规模目标 ≤2k 可接受。后续可单开「View → TaskQuery 统一 executor」。

## 完成记录

### Profiler / 滚动验收清单（T1 / AC-1）

1. 准备：全部任务列表，尽量 ≥200 条。
2. Chrome Performance：录制快速滚动 3s。
3. 通过参考：无明显持续长任务；滚动可跟手。
4. React Profiler：未选中行不应大面积无意义 commit（B 单例 + memo）。
5. 手工：折叠变高、sticky 顶替、续拉、筛选后拇指与列表一致。

### 代码要点

- B：`metadata-fields/adapters/taskMetadataFields.tsx` 单例 getter
- C：`TaskBoard` sticky DOM push
- D：`serverDrivenFilters` + list standalone placement
- E：View infinite + serverDriven status；偏差见上
- 前序归档：hardening + virtualization 任务
