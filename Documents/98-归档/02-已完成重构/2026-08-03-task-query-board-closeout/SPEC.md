# 任务查询与 Board 架构收口 - Spec

## 背景与目标

前三轮任务（virtualization / hardening / perf）已让 list 主路径可用，但审计仍留下 **F1–F4** 半截债务，导致「做了很久仍没收口」。本任务目标是**真正做掉并收口**，不再以 follow-up 名义搁置。

| 编号 | 目标 |
|---|---|
| F1 | View 读路径与 list 对齐：能 SQL 的走同一套分页/count；复杂 View 显式降级并契约一致 |
| F2 | page filter（priority / date / project）下推查询，前端不再二次滤与 totalCount 打架 |
| F3 | `totalCount` 加载态语义干净：禁止 `?? 0` 混淆「未就绪」与「零条」 |
| F4 | sticky / virtual 从 `TaskBoard` 抽 hook，Board 变薄、几何仍在 model |

## 范围

- `list_tasks` 输入扩展：priorities、dateFilter、project（已有 placement）与 count 同过滤
- 前端 list 场景：filter 状态驱动 `listInput`（query key），`serverDrivenFilters` 覆盖已下推字段
- `run_task_view`：SQL 可表达时用分页+count；不可时保持窗口契约但共享 DTO/前端 infinite
- `useTaskData` / Board：`totalCount` optional
- `useTaskBoardSticky`（或等价）+ virtual 接线抽离
- 同步 A2/A3；归档本任务

## 不做什么

- 不换虚拟列表库、不换 shadcn ScrollArea
- 不把 VirtualList 抽到 shared（仍仅 task 消费者）
- 不重做全部系统 View 的复杂本地时区语义为 100% SQL（做不到的写进偏差，但必须收窄到「仅复杂分支」）
- 不改产品视觉/信息架构

## 用户场景与需求

1. 用户改 priority/date/project 筛选：列表与总数、拇指一致，无底部幽灵空白。
2. 打开系统/自定义视图：续拉与 totalCount 可靠；简单视图不先灌全量再切片。
3. 折叠分区 / sticky 顶替：行为不变，代码更好维护。
4. 首屏 loading：不把「未知总数」当成 0。

## 能力边界

- 规模目标仍 ≤2k 任务
- 日期筛选按**本地日**边界下推（后端收 RFC3339 区间或 mode 枚举）
- 复杂 View（自定义多字段 sort / 特殊 system 内存语义）允许内存收口，但 totalCount/nextCursor 契约不变

## Definition of Done

- F1–F4 均在 TASKS 勾选并有测试或手工验收点
- 无 `totalCount ?? items.length`；loading 与 0 条可区分
- list 场景 priority/date/project 与 status/standalone 一并 serverDriven
- TaskBoard 行数明显下降或 sticky/virtual 逻辑迁出独立模块
- typecheck + 相关 vitest / 必要 cargo test 通过
- 本任务目录可归档

## 验收标准

- **AC-1**：When `list_tasks` 响应尚未返回，Board 不得用 `totalCount=0` 锁定错误占位高度。
- **AC-2**：When 用户选择 priority / date / project 筛选，list 请求携带对应条件且 totalCount 与可见列表同语义（前端不再二次滤这些字段）。
- **AC-3**：When View 定义仅含 SQL 可表达过滤且排序为默认 position 序，`run_task_view` 不得先加载全表候选再仅内存分页。
- **AC-4**：When View 必须内存处理，仍返回 `totalCount` + `nextCursor`，前端 infinite 行为与 list 一致。
- **AC-5**：sticky 顶替与折叠改拇指行为不回归；几何函数仍可单测。
- **AC-6**：危险兼容已清：`?? items.length`、Board querySelector、Overlay 硬编码 task 选择器不得回归。

## 关联模块

- `src-tauri/crates/application` task / view
- `src-tauri/crates/storage` task repository
- `src/features/task` hooks / Board / model
- `src/features/view` run infinite
- `src/shared/types` ListTasksInput
- `Documents/01-架构` A2/A3

## 当前技术方案

见 [PLAN.md](./PLAN.md)。

## 关联文档

- 归档：`98-归档/.../2026-07-31-task-collection-query-virtualization`
- 归档：`98-归档/.../2026-07-31-task-board-hardening-and-view-window`
- 归档：`98-归档/.../2026-07-31-task-board-perf-query-unify`
- 《任务方案编写 SOP》
