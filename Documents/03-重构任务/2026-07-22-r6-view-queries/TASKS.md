# R6 View 与查询 - Tasks

## 当前阶段

未开始。依赖 R5；Views 只服务 Task，不承担 Project 管理、团队协作或知识库能力。

## 阶段一：定义受限查询语言与范围语义

目标：使保存的 View、临时 filter 和系统页面共享同一可验证 query model。

- [ ] 定义受限 filter、sort、group DTO 和参数校验，只接受已确认的 Task 字段与运算符。
- [ ] 定义查询范围：默认 All Space、指定单 Space、指定 Project；Project 必须属于其 Space。
- [ ] 明确查询中的 archived/deleted 可见性，避免把管理状态混进普通 Task View。
- [ ] 将 URL search 参数解析为同一 DTO，不让页面各自拼装 SQL 或过滤规则。
- [ ] 覆盖非法字段、冲突范围、空条件和 URL 参数恢复的纯测试。

验收：所有 Task 列表都能落到同一种受限 query definition；前端无法构造未知数据库字段过滤。

## 阶段二：实现系统 View 与 All Space 查询

目标：优先交付个人工作流的稳定入口，不把“全部任务”误实现为“仅进行中”。

- [ ] 实现 All Tasks，默认展示所有可见 Task；用户可叠加并保存筛选条件。
- [ ] 实现待处理、今天、即将到期、逾期等系统 View，明确它们基于 WorkState、due 和当前时区的语义。
- [ ] 使全部 Space、单 Space 和 Project 范围复用相同查询执行器。
- [ ] 对无 due、已完成、已取消和跨时区边界写出明确预期与测试。
- [ ] 验证系统 View 不依赖旧 Focus/Inbox 模型。

验收：All Tasks、系统 View 和页面 filter 不会产生不同的字段解释；时区和状态边界有回归测试。

## 阶段三：实现自定义 View 的持久化与生命周期

目标：让用户保存 Task 查询，而不是保存易漂移的结果快照。

- [ ] 实现自定义 View 的创建、更新、排序、删除、归档/恢复和同步 payload。
- [ ] 保存 query definition 与显示偏好，不保存 Task ID 列表或查询结果 snapshot。
- [ ] 预留 `space_id` 字段支持将来范围匹配，但当前默认可全局可见；不提前做权限或团队 sharing。
- [ ] 处理系统 View 与自定义 View 的命名、删除和恢复差异，禁止删除系统定义。
- [ ] 覆盖 View 更新、同步重放、范围切换、名称冲突和删除恢复测试。

验收：自定义 View 是可重放定义；系统 View 不被当作用户实体破坏；同步不携带任务结果副本。

## 阶段四：查询性能与前端契约迁移

目标：让高频列表查询有明确索引证据，前端不保留第二套 filter 真相源。

- [ ] 基于实际 query shape 添加最小索引，如 Space/status/due/position 组合索引；每项索引需用 `EXPLAIN QUERY PLAN` 证明用途。
- [ ] 迁移前端 URL search、filter state、View 保存和 Query hooks 到新 DTO。
- [ ] 处理筛选记忆：以 URL/保存 View 为真相，不用独立全局 store 覆盖路由状态。
- [ ] 删除旧 Focus、Inbox、View snapshot 查询、重复 filter selector 和兼容 UI 分支。
- [ ] 运行查询计划、View 定向测试、前端类型检查与 workspace 校验，更新文档。

验收：常用列表查询有索引证据；前端/后端只保留一套可解释的 filter contract；旧 Focus/Inbox 残留为零。

## 阻塞

- R5 未完成。
- “提醒如何触发”和自定义状态/优先级不属于本任务，不能借 View 增加隐式业务规则。

## 与 SPEC 的实施偏差

无。

## 完成记录

- 完成日期：
- 已更新的长期文档：
- 遗留技术债：
