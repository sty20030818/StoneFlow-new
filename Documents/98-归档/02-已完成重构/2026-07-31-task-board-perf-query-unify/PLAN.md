# 任务 Board 滚动手感与查询语义统一 - Plan

## 方案概述

在**不改 UI 壳**前提下：

1. **滚动手感（B/C）**：减少行重渲与 sticky 的 React 写；不换滚动库。
2. **查询语义（D/E）**：list 可下推筛选进 `list_tasks`；View 系统路径对齐窗口；`totalCount` 与可见过滤同语义。
3. **A**：用清单验收，不写死帧率数字。

## 备选方案与取舍

### B：行交互减重

| 方案 | 结论 |
|---|---|
| 每行 useMemo 建 dropdown props（现状） | 滚动时仍占模块与闭包成本；放弃 |
| **Module 级单例 create*DropdownProps（采用）** | 零 UI 变化；实现简单 |
| 虚拟行完全不挂 Metadata 直到 hover | 交互延迟风险；本轮不做全量，仅单例 + 已有 open 懒挂载审计 |

### C：sticky push

| 方案 | 结论 |
|---|---|
| React style 每帧 pushOffset（现状） | 简单但跟 virtualizer 重渲叠在一起 |
| **浮层 ref + rAF DOM transform；index 变 setState（采用）** | UI 不变；跨分区更顺 |
| 全部 CSS sticky 非虚拟 header | 与虚拟 absolute 冲突；放弃 |

### D：筛选下推

| 方案 | 结论 |
|---|---|
| 维持前端滤 + server totalCount | 空白 spacer；拒绝作为终态 |
| **status / standalone / project / showCompleted → listInput（采用）** | 与现有 SQL 能力匹配 |
| priority + date 全 SQL | 本轮可选；未完成则偏差 AC-7 |

实现要点：

- `useTaskListScene`：从 page filter controller 读 status/standalone/project，写入 `ListTasksInput`。
- `useTaskPageFilterController` 或 collection：对**已下推**字段跳过二次 `matchesFilters`。
- `placement: standalone | project` 已有后端能力。

### E：View 窗口加强

| 方案 | 结论 |
|---|---|
| 仅内存切片（硬化任务） | 打开仍可能重 |
| **系统 View → 映射 statuses/lifecycle 后走 list 分页 API 或 query 同构（采用优先）** | 与 list 共享 executor 心智 |
| 自定义 View 全 SQL | 过滤 DSL 大；本轮保持候选+切片，契约已分页 |

### A：验收

不引入 CI 帧率门禁；TASKS 列 Profiler 步骤与通过标准（主观可跟手 + 无持续 >50ms 长任务为参考）。

## 数据流

```
[List scene]
  pills/filter → listInput { statuses, placement, … }
       → list_tasks (SQL window + totalCount)
       → items (不再用同一条件前端再滤)
       → TaskBoard

[View scene]
  system view → statuses/lifecycle 映射 → list 或 run_task_view 窗口
  custom view → run_task_view 候选滤排切片 + totalCount

[Board scroll]
  virtualizer re-render (range only)
  sticky push: DOM transform（非 setState 每帧）
```

## 风险

| 风险 | 缓解 |
|---|---|
| 下推后 filter 与 pills 状态不同步 | 单一状态源：pill 改 listInput 且同步 controller |
| sticky DOM 与 React 标题不同步 | index 变时强制 setState；测双影 |
| View 双路径分叉 | 系统/自定义边界写进代码注释与 A2 |
| 范围膨胀到 priority SQL | AC-7 偏差出口 |

## 完成后需要同步的长期文档

- [ ] `Documents/01-架构/A2-系统设计.md`：list 筛选下推；View 系统/自定义窗口差异
- [ ] 本任务归档入 `98-归档/02-已完成重构/`
