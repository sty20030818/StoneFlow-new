# R3 Space - Spec

## 目标

在新基线之上完成 Space 的完整纵切，并把默认 Space 与级联生命周期规则落到可调用契约。

## 范围

- Space 创建、读取、更新、默认切换、归档、恢复、删除与永久删除。
- 默认 Space 被归档或删除时选择替代活跃 Space；无替代项时拒绝操作。
- Space 生命周期对 Project 与 Task 的级联，以及精确恢复原层级与排序。
- application、storage、runtime command、前端 DTO 与测试同步完成。

## 不做什么

- 不实现 Project/Task 自身的完整编辑 UI。
- 不将 Space 做成层级或团队容器。

## 当前上下文

- Space 是个人工作区的第一层边界，不是成员、权限或团队系统。
- 默认 Space 是用户进入应用、Launcher 创建任务和全局任务范围的稳定回退点。
- Space 的归档/删除会影响 Project/Task，因此不能只写一条 Space 更新 SQL。

## 用例与输入输出

- `create_space`：创建活跃 Space；首个 Space 自动成为默认 Space。
- `update_space`：只更新 Space 自身可编辑字段，不能隐式迁移 Project/Task。
- `set_default_space`：目标必须活跃且未删除；事务中清除其他 active default。
- `archive_space` / `delete_space`：先选择替代默认 Space，再级联记录受影响对象及排序，最后写一个 operation。
- `restore_space`：只恢复该 operation 记录的 Space、Project、Task，不恢复后来独立删除/归档的对象。
- `permanently_delete_space`：物理删除业务数据、Activity/links 与写 tombstone/Outbox；无 UI 回收站兼容。

## 实施设计

1. application 的 Space service 接收 DTO 并调用受控 persistence port，不接触 SeaORM model。
2. storage 在一个 transaction 内读取替代默认 Space、执行级联、写 restore manifest、Activity 和 Outbox。
3. command 返回新的 Space/受影响范围 DTO；前端只失效 Space/Project/Task 相关 Query，不解析底层级联细节。
4. 默认 Space 的唯一性由部分唯一索引兜底；被竞态触发时映射为稳定 conflict 错误。

## 前端契约影响

- Space 列表、当前 scope、Launcher 初始选择和“全部 Space”查询需要使用新 DTO。
- 删除/归档完成后，前端按 command 返回的 replacement Space 导航，不自行猜测。

## 退出条件

- 默认 Space 唯一性由数据库和 application 双层保证。
- 每个 Space 操作均在单事务写 Activity/Outbox/级联记录。
- 前端可通过稳定 command 合约使用新 Space 模型。

## 验证

- 替代默认 Space、无替代拒绝、级联恢复和批量失败回滚测试。

## 风险

- Space 生命周期是跨聚合操作，不能拆给 Project/Task command 分别提交。
- 恢复 manifest 必须以 operation 为粒度，否则会错误恢复用户后来改变过的对象。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
- [R2 领域与存储基线](../2026-07-22-r2-domain-storage-baseline/SPEC.md)
