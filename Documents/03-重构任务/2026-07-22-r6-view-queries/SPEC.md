# R6 View 与查询 - Spec

## 目标

完成任务查询模型：固定系统 View、可保存自定义 View、URL Filter 与高效 SQLite 查询路径。

## 范围

- 系统 View 由代码定义，不持久化。
- 自定义 View 持久化 `scope + filters + sort + group_by`，不缓存 Task ID。
- Filter 属于 URL，用户保存后才成为 View。
- 全部任务固定路由；待处理、今天、即将到期/逾期使用已确认的时间语义。
- 基于 `EXPLAIN QUERY PLAN` 增加实际需要的 SQLite 索引。

## 不做什么

- 不实现通用报表、跨实体 View、全文检索或用户自定义状态/优先级。

## 当前上下文

- 全部任务是稳定产品入口，不是用户可删除的 View。
- 系统 View 是产品语义，必须版本随代码走；自定义 View 只保存查询定义，不复制 Task 结果。
- 查询性能需由新 Task schema 的真实 filter/sort 路径决定，不能沿用旧 Focus/Inbox 索引。

## 查询语义

- 待处理：待执行、进行中、等待中三种非终态。
- 今天：计划时间或截止时间落在用户本地今天。
- 即将到期/逾期：只使用截止时间。
- scope 可为全部 Space 或单 Space；Project 是 filter 而非全局层级。
- URL filter 是临时探索；保存后生成自定义 View，加载时恢复 filter/sort/group 配置。

## 实施设计

1. 在 domain/application 将 filter/sort/group 定义为受限枚举和结构化 DTO，不允许前端传任意 SQL/字段名。
2. 系统 View 通过纯函数生成 query definition，不写入数据库。
3. storage 根据 definition 构造参数化 SeaORM 查询；测试覆盖等价 SQL 和排序稳定性。
4. 先以 `EXPLAIN QUERY PLAN` 验证 Space、状态、截止时间和 position 的组合索引；仅当测量显示文本搜索瓶颈才讨论 FTS5。
5. View 的同步只同步用户保存的定义，系统 View 不进入 Outbox。

## 前端契约影响

- routes/search params 是 Filter 真相；Zustand 只保存瞬态控件状态。
- 保存 View 后失效 View 列表与当前任务查询，不缓存或手动维护 Task ID 集合。

## 退出条件

- 查询结果不依赖旧 View snapshot 或 Focus/Inbox 语义。
- 索引与 SQL 查询有定向性能验证。

## 验证

- 系统 View 语义、URL Filter、保存/恢复 View 和查询计划测试。

## 风险

- “今天”必须从 UTC 时间转到用户本地日期再比较，不能用数据库 UTC date 截断替代。
- groupBy 只影响展示与排序组合，不改变 Task 持久化或同步顺序。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
- [R5 Task 与 Activity](../2026-07-22-r5-task-activity/SPEC.md)
