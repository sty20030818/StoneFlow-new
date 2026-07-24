# R5 Task 与 Activity - Spec

## 目标

完成核心 Task、TaskLink、Activity、批量操作及删除撤销的完整纵切。

## 范围

- Task 的创建、编辑、状态、优先级、计划/截止/提醒时间、排序和归属变更。
- TaskLink 仅保存 URL 与标题。
- Task Activity 时间线及其有效用户操作；描述只记录“已修改描述”。
- 同类型批量操作的全成全败事务语义。
- 对齐 Space/Project 的回收站生命周期：软删除、按原 operation 恢复、永久删除时写最小 tombstone。

## 不做什么

- 不实现提醒投递、附件、Markdown 协同编辑或通用审计日志。

## 当前上下文

- Task 是 StoneFlow 的核心实体；Activity 是 Task 的用户可见时间线，两者必须在同一操作内决定是否记录。
- 描述是纯文本；当前不引入编辑器内容模型、差异存储或全文版本历史。
- 删除 Toast 的撤销要求操作可跨同步边界恢复，不能仅在前端撤销本地 mutation。

## 用例与输入输出

- `create_task` 要求 Space，可选 Project、WorkState、描述与 TaskLinks；不再创建 Inbox Task。
- `update_task` 使用字段 patch，名称、描述、状态、优先级、时间、Space、Project、position 独立表达。
- `bulk_update_tasks` 只接受同类型 Task IDs 和一种明确操作；整个集合要么全部完成，要么回滚。
- `archive/delete/restore` 产生一个 operation；delete 先进入回收站，restore 只接受原 lifecycle operation；permanently delete 才物理清理 links/Activity 并写 tombstone。
- Activity 记录创建、名称、描述、WorkState、时间、归属、生命周期和 restore；不记录排序/同步/自动字段。

## 实施设计

1. Task application service 负责业务校验、Activity action 判定和 operation 创建；storage 负责一笔 transaction 持久化。
2. TaskLink 是 Task 内聚子资源，不创建独立聚合或同步流程。
3. 描述 patch 只产生活动类型，不携带旧新正文；同步 patch 可携带当前正文，但日志必须脱敏。
4. Batch operation 使用一个 `operation_id` 和一个远端事务；每个 Task 可有自己的 Activity 记录。
5. 回收站 restore 沿用 R3 的 operation guard；永久删除后以 tombstone generation 拒绝旧离线 patch。

## 前端契约影响

- 创建/编辑 UI 统一提交 WorkState 字段，不再使用待完成/已完成二态专用 mutation。
- 删除 Toast 接收当前 lifecycle operation 标识；撤销调用既有 restore command。
- Activity 时间线按后端 action 渲染，不由前端根据字段 diff 猜测。

## 约束

- 已完成/已取消为终态；重新进入非终态时清空 `completed_at`。
- 排序、同步拉取与自动时间维护不创建 Activity。
- 永久删除 Task 同时删除链接与 Activity。

## 退出条件

- Task 的业务、Activity 和 Outbox 在同一事务落盘。
- 批量操作、级联、删除、恢复和离线异常均有自动化验证。

## 验证

- 状态转移、跨 Space 归属、批量回滚、Activity 去重和删除撤销测试。

## 风险

- Task 是跨前端、storage、sync 的高频路径，任何部分写出独立 Outbox/Activity 都会破坏原子性。
- 不能为了速度跳过批量操作预校验，否则会产生部分完成的用户数据。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
- [R4 Project](../2026-07-22-r4-project/SPEC.md)
