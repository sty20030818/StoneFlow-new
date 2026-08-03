# 任务查询与 Board 架构收口 - Plan

## 备选方案与取舍

| 方案 | 取舍 |
|---|---|
| A. 仅文档标债不改代码 | 否决：用户要求真正收口 |
| B. View 全量改 SQL keyset 一次做完 | 风险高：自定义 sort/group/system 本地日语义 |
| **C. 分层收口（推荐）** | list 全量下推；View SQL 可表达走同分页；复杂 View 显式降级 |

采用 **C**。

## 数据流

### list（终态）

```
filter UI state ──► ListTasksInput { statuses, priorities, dateFilter, placement, project… }
                         │
                         ▼
              list_tasks → TaskListQuery → SQL list_page + count
                         │
                         ▼
              infinite pages → Board（serverDriven 全覆盖 → 无二次滤）
```

### view（分层）

```
view definition → SQL 候选过滤（status/project/due/priority…）
       │
       ├─ 可完全 SQL + position 序 → list 同构 keyset + count
       └─ 需内存 sort/system_matches → 内存滤排 + 切片窗口（AC-4）
```

## F3 totalCount 语义

| 状态 | totalCount |
|---|---|
| pages 未就绪 | `undefined` |
| 就绪 | `pages[0].totalCount`（number，可为 0） |

Board：`undefined` 时不按 total 占位，仅用已加载 flat。

## F2 下推字段

- `priorities: number[]`（空=不限）
- `dateFilter`: `{ mode: 'hasDate'|'noDate'|'today'|'tomorrow'|'thisWeek'|'overdue', ...bounds? }`  
  前端算本地日 → 传 ISO 边界或 mode，后端 SQL 用 due_at/planned_at 合一策略与现前端 `resolveTaskDateValue` 对齐（优先 due_at，否则 planned_at——实现时读前端并一致）
- `projectId`：已有 placement.project；page 上「按项目筛」用 placement 或显式 project 条件

filter 状态须在 **data hook 之上**，否则无法驱动 query key。

## F4 拆分

```
taskBoardModel.ts          — pure（已有）
useTaskBoardSticky.ts      — push DOM + active index
useTaskBoardVirtual.ts     — virtualizer + rangeExtractor + extent
TaskBoard.tsx              — 组合 + 行渲染
```

## 风险

1. 日期字段 due vs planned 不一致 → 与现前端 `resolveTaskDateValue` 对齐并单测  
2. View 降级分支漏标 → TASKS 偏差写清  
3. filter 上提破坏 Views/Project 场景 → 逐场景 serverDriven 列表  

## 完成后同步长期文档

- A2：list 下推字段、View 分层、totalCount 语义  
- A3：`data-scroll-extent`（已有则复核）
