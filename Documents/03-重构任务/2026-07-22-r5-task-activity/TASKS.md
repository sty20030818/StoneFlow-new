# R5 Task 与 Activity - Tasks

## 当前阶段

未开始。依赖 R4；这是任务核心链路，所有写操作必须通过 R2 提供的事务与 operation context。

## 阶段一：实现 Task 核心读写与 WorkState

目标：建立清晰的 Task application service，不让 command、repository 和同步 payload 在同一个模块混杂。

- [ ] 实现创建、读取、更新标题与描述、状态、优先级的 application command/query。
- [ ] 复用共享 `WorkState`，不在 Task 内定义第二套枚举、完成时间或时间字段规则。
- [ ] 让状态变更遵守手动切换和离开完成清除 `completed_at` 的领域规则。
- [ ] 定义稳定 Task DTO，隔离 storage entity 与 Tauri transport。
- [ ] 为每个基础 command 在事务中创建 outbox 变化，但不在这里实现远端传输。
- [ ] 覆盖标题/描述更新、五种状态、五级优先级和完成时间的应用层测试。

验收：Task 核心 API 不泄漏数据库模型；状态和时间语义与 R2 一致；失败写入不留下部分 outbox。

## 阶段二：落实归属、时间与手动排序

目标：把 Task 归属规则、三个时间和排序作为同一条业务契约处理。

- [ ] 创建与移动 Task 时，强制 Task 属于一个 Space，Project 可空且必须属于同一 Space。
- [ ] 移除 Inbox 作为独立业务实体；无 Project 的 Task 直接归属 Space。
- [ ] 实现 planned、due、remind 的完整读写；提醒只保存时间，不承诺通知行为。
- [ ] 实现 Task 在各自容器内的手动 `position` 排序与移动；排序变更不写 Activity。
- [ ] 明确归属、时间或排序变更生成的 outbox 范围，并验证跨 Space 项目归属被拒绝。
- [ ] 覆盖无 Project、同 Space Project、跨 Space 拒绝、时间清空、相邻移动和空容器排序测试。

验收：任何 Task 不能跨 Space 挂接 Project；三个时间字段可独立维护；排序可重放且不污染用户可见历史。

## 阶段三：实现 Activity、链接、批量与删除恢复边界

目标：只记录用户可理解的 Task 操作，并让高风险操作在本地和同步层都有确定语义。

- [ ] Activity 仅服务 Task 时间线，记录用户可见操作；不记录排序、同步和自动维护字段。
- [ ] 描述变更只记录“已修改描述”，不复制正文；状态、优先级、时间、归属等记录可理解的前后语义。
- [ ] 实现 TaskLink 的写入、读取和删除规则，并随永久删除 Task 一并删除关联与 Activity。
- [ ] 实现同实体类型批量操作：一个 `operation_id`，本地全成功或全失败；禁止混合 Project/Task 批量请求。
- [ ] 定义删除、撤销与恢复的 API 边界：当前可物理删除；撤销 Toast 所需的短时恢复契约只预留 application command，不实现 UI。
- [ ] 覆盖批量失败回滚、Activity 写入、永久删除清理、链接清理和 operation 聚合测试。

验收：用户可见操作有准确时间线；批量操作不可半成功；物理删除不会遗留可见 Activity 或链接。

## 阶段四：前端契约与回归验证

目标：在不混入前端重构的前提下，确认新后端能承载已确认的 Task 产品模型。

- [ ] 列出并替换 Task invoke contract；保留 DTO 兼容仅限本阶段迁移需要，不建立长期双接口。
- [ ] 验证创建任务可以选择 Space、可选 Project、状态、优先级及三个时间字段。
- [ ] 验证默认 All Space 查询与后续 task-only Views/filters 所需字段完整，但不在此任务实现 View 重写。
- [ ] 验证失败码能让前端区分校验失败、归属冲突和不存在，而不暴露数据库错误。
- [ ] 运行 Task/Activity 定向测试与 workspace 级校验，并更新相关长期文档。

验收：已确认的 Task 创建与编辑字段都有稳定契约；后端测试及前端类型检查通过；旧 Task 实现无残留生产调用。

## 阻塞

- R4 Project 模块未完成。
- 同步远端协议在 R7 完成前不能作为本任务验收前提；只验收本地 outbox 语义。

## 与 SPEC 的实施偏差

无。

## 完成记录

- 完成日期：
- 已更新的长期文档：
- 遗留技术债：
