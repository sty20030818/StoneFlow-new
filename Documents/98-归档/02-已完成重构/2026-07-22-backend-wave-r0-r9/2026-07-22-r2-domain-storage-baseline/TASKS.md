# R2 领域与存储基线 - Tasks

## 当前阶段

已完成。依赖 R1；本任务只建立可复用的领域与持久化基线，不实现具体 Space、Project、Task 的完整 use case。

## 阶段一：定义领域契约与共享 WorkState

目标：把实体规则和应用层所需的端口稳定下来，避免每个模块各自解释状态、优先级和时间。

- [x] 定义 `WorkState`：状态为待执行、进行中、等待中、已完成、已取消；优先级为无、低、中、高、紧急。
- [x] 定义 Task 与 Project 共享的时间值：planned、due、remind 使用精确 UTC 时间戳；提醒的实际触发机制不在本任务实现。
- [x] 定义状态迁移规则：所有状态可手动切换；离开已完成必须清空 `completed_at`；历史由 Activity 承担，不从实体当前状态推导。
- [x] 定义 Space、Project、Task、Activity、View 所需的领域 ID、版本/生成代际、排序位置和值对象。
- [x] 定义 application command/query DTO 与 repository port；禁止暴露 SeaORM entity、数据库行或 Tauri type。
- [x] 为领域规则编写纯单元测试，覆盖同 Space 约束、完成时间清除、时间字段合法性和排序归属。

验收：状态、优先级、时间和实体归属只存在一份领域定义；application 可以只依赖 domain 编译与测试。

## 阶段二：建立新 SQLite Schema 与基础索引

目标：让新库模型直接表达已确认的产品规则，而不是从旧表结构妥协演变。

- [x] 为 Space、Project、Task、Activity、TaskLink、View、Outbox、Tombstone、同步 cursor/operation metadata 设计新表。
- [x] 在数据库层加入 Task 的 `space_id` 与 optional `project_id` 同 Space 约束所需的索引或事务校验基础。
- [x] 为 Project/Task 容器内手动 `position` 排序设计复合索引；不要引入自动排序或基于时间的隐式排序。
- [x] 为同步查找、outbox 扫描、tombstone 查询和 cursor delta 设计最小必要索引，避免预建未验证的性能索引。
- [x] 建立 schema seed/fixture，仅服务测试，不把测试初始化逻辑泄漏到 runtime。
- [x] 用空库初始化和结构断言测试验证 schema、外键、索引及默认值。

验收：空 SQLite 可一次建成新 schema；关键完整性约束与访问路径有测试；旧 Inbox/旧兼容字段不进入新表。

## 阶段三：事务、Outbox 与删除元数据基础

目标：为后续本地写入、批量操作和同步提供统一原子边界，而不是让每个模块自建事务协议。

- [x] 定义 application 写操作的 transaction boundary：业务实体、Activity、Outbox 和必要同步 metadata 在同一 SQLite 事务提交。
- [x] 实现可注入的 operation context，支持单次用户操作共享 `operation_id`、设备标识和创建时间。
- [x] 实现 Outbox 记录与合并规则的基础接口；具体 Task/Project payload 在对应业务任务填充。
- [x] 实现最小 Tombstone metadata：实体类型、ID、generation、deletion sequence；不得保存业务正文。
- [x] 明确物理删除与 tombstone 写入的原子关系，保证长期离线设备不能用旧 patch 复活已删除实体。
- [x] 为事务回滚、同 operation 原子性、outbox/tombstone 写入和失败注入建立集成测试。

验收：模拟任一写入失败时实体、活动和 outbox 不会半提交；删除元数据足以支持后续 stale patch 拒绝；无业务模块自行直接管理事务。

## 阻塞

无。

## 与 SPEC 的实施偏差

- 硬切零兼容起点：旧 `inbox_at` / `sync_mutations` / `sync_shadow` 路径拆除。
- **回收站回补（本轮）**：`deleted_at` 软删 + 永久删 tombstone；`domain::work` 模块整理；status 保持 TEXT enum。
- **Task 归档回补**：`tasks.archived_at` 恢复；Space / Project / Task 均支持归档与软删。
- runtime 业务 CRUD / lifecycle 写路径仍为 stub，完整实现留给 R3–R5。
- Seed 仅默认 Space「个人」；不预置系统 View / 默认 settings 行。

## 完成记录

- 完成日期：2026-07-22
- 已更新的长期文档：`Documents/01-架构/A1-领域模型.md`（含回收站两阶段与 work 模块）
- 遗留技术债：
  - lifecycle 软删/恢复/永久删仓储与 Outbox 接线未完成（契约已对齐）
  - Task/Project/View 仓储与真实 CRUD 待 R3–R5
  - Activity 仓储尚未按新 activity 表完整重建
