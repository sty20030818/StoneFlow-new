# 任务 Board 滚动手感与查询语义统一 - Spec

## 背景与目标

前序两波（集合虚拟化、Board 硬化与 View 窗口）已使 list/view 可滚动、可续拉、可折叠变高。当前体感瓶颈从「能不能用」转为：

1. **滚动仍偏卡**：行内 metadata/dropdown 偏重；sticky 顶替仍走 React style 每帧更新。
2. **查询语义双轨**：page filter 部分仍前端二次过滤，与 `totalCount`/窗口不一致。
3. **View 窗口偏内存**：`run_task_view` 仍先拉候选再切片；系统视图可进一步对齐 list SQL 窗口。

目标：在**不改 UI/UX 外观与交互流程**的前提下，完成滚动手感收口（A/B/C）与查询语义统一（D/E），使 ≤2k 任务下滚动与打开更稳、总数与列表一致。

前序归档：

- `98-归档/02-已完成重构/2026-07-31-task-collection-query-virtualization/`
- `98-归档/02-已完成重构/2026-07-31-task-board-hardening-and-view-window/`

## 范围

- **A**：滚动性能验收方法（Profiler/手工矩阵），写入 TASKS，执行时按清单验证。
- **B**：行内 priority/status dropdown options **Board 级单例**；ContextMenu/重菜单继续仅 open 时挂载（审计补齐）。
- **C**：sticky 顶替 **pushOffset 纯 DOM**；仅 active 分区变化时 React 更新标题。
- **D**：list 场景将 **status / showCompleted / standalone / project** 下推为查询条件；避免与服务端 `totalCount` 双滤冲突。priority/date 若本轮不能下推，在偏差中显式登记并保留前端滤。
- **E**：系统 View（及能映射到 TaskListQuery 的路径）尽量走与 `list_tasks` 同构的窗口；自定义复杂 View 可保留「候选+切片」但契约仍为 `totalCount`+cursor。
- 同步 A2 中与「双滤 / View 窗口」冲突的描述（若有）。

## 不做什么

- 不改 Board 视觉（行高、分区样式、滚动条外观、sticky 外观意图）。
- 不换成 shadcn ScrollArea / react-virtuoso。
- 不把 VirtualList 抽到 shared（仍仅 task 消费）。
- 不重做筛选条 UI、不重做创建/详情。
- 不强制本轮把 priority/date 全部 SQL 化（可偏差延后）。
- 不做 ≥500 自动 seed 流水线（验收说明即可）。

## 用户场景与需求

### US-1：滚动要顺

作为用户，我在数百条任务上连续滚动时，界面应保持可跟手，分区标题顶替自然，以便快速扫状态。

### US-2：筛完数得对

作为用户，我使用状态/独立事项/项目等筛选时，列表条数与「共 N 条」/滚动条长度应一致，不要列表很短却留大段空白。

### US-3：视图与全部任务一样能窗口化

作为用户，我打开系统视图或自定义视图时，应能流畅打开并续拉，而不是一进页就卡在全量。

## 能力边界

- 目标规模仍 ≤2k 可见任务。
- UI/UX 控件与布局不变；允许数据语义从「略不一致」修正为「一致」。
- View 复杂过滤可能仍部分在应用层完成，但对外契约统一为分页页。

## Definition of Done

- A–E 对应验收标准全部通过（或偏差已登记且发起人接受）。
- 相关自动化测试通过；typecheck 通过。
- A2（若改）与 TASKS 完成记录已更新。
- 无阻塞级滚动回归（折叠变高、sticky 顶替、续拉仍可用）。

## 验收标准

- **AC-1**：当开发者按 TASKS 中 Profiler/滚动清单在代表数据上验收时，系统应当满足清单中的通过条件（主线程无持续长任务导致明显掉帧；行 commit 次数合理）。
- **AC-2**：当用户滚动任务 Board 时，系统应当保持分区 sticky 顶替可见行为与改前一致（吸顶 + 下一分区顶走当前），且不得引入双标题重影。
- **AC-3**：当用户折叠或展开状态分区时，系统应当继续使内容总高与滚动条拇指随可见结构变化（与硬化任务行为一致）。
- **AC-4**：当用户仅滚动且不改变选中/悬停/打开菜单时，系统应当避免为每行重复构建 priority/status 下拉 options 工厂（Board 级单例或等价）。
- **AC-5**：当用户在全部任务/独立事项 list 场景应用 status、独立事项、项目筛选（及与 showCompleted 等价的完成态约束）时，系统应当由服务端窗口返回匹配集合，且 `totalCount` 与该过滤语义一致（前端不得再对同一条件二次过滤导致列表与总数冲突）。
- **AC-6**：当用户打开系统 View 并滚动接近末尾时，系统应当能按 `nextCursor` 续拉并展示 `totalCount`，行为与 list 窗口语义一致。
- **AC-7**：如果某类筛选（如 priority/date）本轮未下推，则系统应当在 TASKS 偏差中显式记录，且 UI 仍可用（可保留前端滤），不得静默双滤且不写偏差。
- **AC-8**：如果续拉或查询失败，则系统应当保留已展示窗口并允许重试，不得崩溃主窗口。

## 关联模块

- `features/task`（Board、Row、list scene、filter、queries）
- `features/view`（run view、infinite、scene）
- `shared/components`（AppScrollArea / OverlayScrollbar，仅在触及时）
- `application/task`、`application/view`、`storage` task/view 读路径
- `Documents/01-架构/A2-系统设计.md`

## 当前技术方案

复杂方案见 [PLAN.md](./PLAN.md)。摘要：

- B：module 级 priority/status dropdown props 单例；行只消费。
- C：sticky push 用 ref + rAF 写 transform；index 变才 setState。
- D：listInput 吸收 filter 中可下推字段；collection 对已下推字段不再二次滤。
- E：系统 View 映射到 TaskListQuery/list 窗口优先；复杂 View 保持切片契约。
- A：验收清单，不改产品代码。

## 关联文档

- 前序归档两份（上链）
- 《任务方案编写 SOP》《文档体系 SOP》
