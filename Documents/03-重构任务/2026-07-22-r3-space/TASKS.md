# R3 Space - Tasks

## 当前阶段

已完成。依赖 R2；Space 是用户工作区的边界，不引入团队成员、权限或账号系统。

## 阶段一：建立 Space 契约与基础操作

目标：把 Space 的创建、读取与默认选择收口到 application service。

- [x] 定义 Space DTO、command/query port、输入校验和稳定错误码。
- [x] 实现创建、更新、列表、详情与设置默认 Space 的 application use case。
- [x] 首次创建 Space 自动成为默认；随后默认选择必须在活跃 Space 中唯一。
- [x] 为创建、改名、默认切换写入原子 outbox；Space 不记录 Activity。
- [x] 为首个 Space、重复默认设置、空名称和不存在 ID 编写测试。

验收：Space API 不泄漏 storage entity；默认 Space 始终可确定且语义只由 application 实现。

## 阶段二：定义 Archive/Delete 与级联边界

目标：明确管理操作的用户语义，避免删除 Space 后残留悬挂 Project/Task。

- [x] 定义 archive 与 delete 的可用条件、返回错误和用户可恢复边界。
- [x] 对删除或归档默认 Space，由后端自动选择 position 最靠前的替代默认 Space；最后一个活跃 Space 不允许无替代地被移除。
- [x] 为 Project、Task 记录 lifecycle operation 来源；View 在 R6 建立结构化 scope 后处理，不在 R3 级联。
- [x] 让级联业务变更、outbox 与删除 metadata 同事务提交。
- [x] 覆盖默认替代、最后活跃 Space 拒绝、包含 Project/Task 的归档删除和失败回滚测试。

验收：任何活跃状态都不会出现无默认 Space 或孤儿实体；级联操作不可半完成。

## 阶段三：实现恢复与永久删除语义

目标：使管理操作可在产品边界内解释，同时遵守同步的 generation/tombstone 契约。

- [x] 实现 archive/restore 的状态与 operation 来源恢复逻辑；恢复不覆盖用户之后对无关实体的修改。
- [x] 实现永久删除时的物理删除与最小 tombstone 写入，不保留业务正文。
- [x] 明确永久删除与短时撤销 Toast 的关系：本阶段只提供后端可调用的恢复边界，不实现 UI。
- [x] 验证 restore、永久删除、重复请求与本地 outbox 的幂等行为；远端幂等在 R7 完成。

验收：恢复可精确恢复被管理操作影响的实体；永久删除后旧 patch 无法重建 Space。

## 阶段四：迁移调用方与删除旧路径

目标：让前端只通过新的契约使用 Space，避免新旧默认逻辑并存。

- [x] 替换前端 Space API、Query keys、scope/navigation 解析和默认 Space 消费点。
- [x] 验证 All Space 与单 Space scope 都能得到正确的默认 fallback。
- [x] 删除旧 Space command、repository、兼容 DTO 和重复默认选择逻辑。
- [x] 运行 Space 定向测试、前端类型检查和 workspace 校验，更新相关文档。

验收：旧 Space 生产调用无残留；前端路由 scope 与后端默认 Space 规则一致。

## 阻塞

无。

## 与 SPEC 的实施偏差

- Project Activity 延后至 R4；Space 不记录 Activity。
- View 的结构化 scope 与级联策略延后至 R6。
- 恢复实现采用 `archived_by_operation_id` / `deleted_by_operation_id`，替代原计划的 JSON manifest 表；这是更小且可精确归因的实现。

## 完成记录

- 完成日期：2026-07-22
- 已更新的长期文档：R3 SPEC、后端重构总 SPEC、R3 TASKS、后端重构总 TASKS。
- 遗留技术债：R7 实现远端幂等、Outbox 消费与字段 patch 协议；R4 实现 Project Activity。
