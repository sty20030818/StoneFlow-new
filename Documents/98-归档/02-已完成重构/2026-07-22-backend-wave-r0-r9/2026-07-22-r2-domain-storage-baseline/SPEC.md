# R2 领域与存储基线 - Spec

## 目标

建立所有后续模块共享的新领域类型、SQLite baseline、事务边界、Outbox 与删除同步元数据。

## 范围

- 实现 `WorkState`、共享时间模型、状态与优先级值对象。
- 重建 Space、Project、Task、View、Activity、TaskLink 的基础实体与关系。
- 建立 SQLite schema、硬约束、排序字段、Outbox、sync changes、applied operations 与 tombstone。
- 实现短事务、`operation_id`、批量原子性和基础 Activity 写入。

## 不做什么

- 不完成具体 Space/Project/Task 命令与前端交互。
- 不接入远端 Turso 协议或平台 UI。

## 当前上下文

- 当前模型仍以 completed/archived/deleted 时间字段拼装生命周期，Task 与 Project 字段不对齐，且旧 Inbox/Focus 语义仍有残留。
- 当前 storage 的 Repository 既读写实体又暴露原始连接，生命周期与同步由 runtime services 手写事务拼装。
- R2 是唯一允许一次性重置所有基础表的阶段；之后 R3-R8 不应再改字段语义。

## 数据设计

- `work_state` 作为 Task/Project 的一致字段集合：`status`、`priority`、`planned_at`、`due_at`、`remind_at`、`status_changed_at`、`completed_at`。
- 每个同步实体都有稳定 UUID、创建/更新时间、排序 position、generation；不把设备时钟当冲突裁决真相。
- Outbox 保存待发送 operation；applied operations 保存远端幂等结果；sync changes 以单调 server sequence 供 pull；tombstone 只保存删除 identity 与 generation。
- Activity 与实体同事务写入；TaskLink 以 Task ID 外键关联。
- 活跃数据物理删除；恢复由新的 operation 携带明确 restore payload，不依赖旧软删除业务表。

## 实施设计

1. 在 domain 建立值对象、枚举与纯状态转移规则；所有校验均可脱离数据库测试。
2. 在 storage 创建单一 current-schema baseline migration，不保留旧 schema 升级链。
3. 使用 SQLite 外键、部分唯一索引与查询索引守住不可违背关系；application 为用户提供错误语义。
4. 提供受控事务接口，确保实体、Activity、级联记录和 Outbox 只能一起提交。
5. 种子只创建最小默认 Space，不预置 Inbox 或示例 Project/Task。

## 关键约束

- Task 的 `space_id` 不可为空；若 `project_id` 非空，Project 的 `space_id` 必须相同。
- 活跃默认 Space 只能有一个；当前默认 Space 不可删除或归档，必须先将其他活跃 Space 设为默认。
- Project 与 Task 的位置只在各自容器内有意义；position 允许为重排预留间隙。
- 时间一律保存 UTC RFC3339/整数时间戳之一，具体数据库表示只允许一种，不得混用 date-only 与 timestamp。

## 约束

- Task 必属 Space；Project 必属 Space；Task 指向 Project 时两者 Space 必须一致。
- 删除主数据物理删除；同步元数据保留 identity、generation 与 sequence，不保留业务正文。
- 所有时间以 UTC 精确时间戳存储，展示时才转换本地时区。

## 退出条件

- 新库可空库启动并种子默认 Space。
- 约束、事务、Outbox 与 tombstone 有集成测试。
- 后续模块不需要再修改基础字段语义。

## 验证

- domain 单元测试。
- 临时 SQLite 测试覆盖外键、默认 Space、批量回滚和 Outbox 同事务。

## 风险与恢复

- 这是破坏性 schema reset，实施前必须完成 R0；不能把旧库迁移代码伪装成新 baseline。
- schema 约束与 domain 校验可能重复，但前者负责数据完整性，后者负责可读错误，两者都需要。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
