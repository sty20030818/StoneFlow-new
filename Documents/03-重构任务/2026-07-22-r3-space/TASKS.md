# R3 Space - Tasks

## 当前阶段

未开始。依赖 R2；Space 是用户工作区的边界，不引入团队成员、权限或账号系统。

## 阶段一：建立 Space 契约与基础操作

目标：把 Space 的创建、读取与默认选择收口到 application service。

- [ ] 定义 Space DTO、command/query port、输入校验和稳定错误码。
- [ ] 实现创建、更新、列表、详情与设置默认 Space 的 application use case。
- [ ] 首次创建 Space 自动成为默认；随后默认选择必须在活跃 Space 中唯一。
- [ ] 为创建、改名、默认切换写入原子 outbox；不记录尚未定义的 Space Activity。
- [ ] 为首个 Space、重复默认设置、空名称和不存在 ID 编写测试。

验收：Space API 不泄漏 storage entity；默认 Space 始终可确定且语义只由 application 实现。

## 阶段二：定义 Archive/Delete 与级联边界

目标：明确管理操作的用户语义，避免删除 Space 后残留悬挂 Project/Task。

- [ ] 定义 archive 与 delete 的可用条件、返回错误和用户可恢复边界。
- [ ] 对删除或归档默认 Space，要求显式选择可用的替代默认 Space；最后一个活跃 Space 不允许无替代地被移除。
- [ ] 设计 Project、Task、View 及必要同步数据的级联 manifest，确保后续恢复知道哪些实体属于同一次管理操作。
- [ ] 让级联业务变更、outbox 与删除 metadata 同事务提交。
- [ ] 覆盖默认替代、最后活跃 Space 拒绝、包含 Project/Task 的归档删除和失败回滚测试。

验收：任何活跃状态都不会出现无默认 Space 或孤儿实体；级联操作不可半完成。

## 阶段三：实现恢复与永久删除语义

目标：使管理操作可在产品边界内解释，同时遵守同步的 generation/tombstone 契约。

- [ ] 实现 archive/restore 的状态、归属和 manifest 恢复逻辑；恢复不覆盖用户之后对无关实体的修改。
- [ ] 实现永久删除时的物理删除与最小 tombstone 写入，不保留业务正文。
- [ ] 明确永久删除与短时撤销 Toast 的关系：本阶段只提供后端可调用的恢复边界，不实现 UI。
- [ ] 验证 restore、永久删除、重复请求和同步 outbox 的幂等行为。

验收：恢复可精确恢复被管理操作影响的实体；永久删除后旧 patch 无法重建 Space。

## 阶段四：迁移调用方与删除旧路径

目标：让前端只通过新的契约使用 Space，避免新旧默认逻辑并存。

- [ ] 替换前端 Space API、Query keys、scope/navigation 解析和默认 Space 消费点。
- [ ] 验证 All Space 与单 Space scope 都能得到正确的默认 fallback。
- [ ] 删除旧 Space command、repository、兼容 DTO 和重复默认选择逻辑。
- [ ] 运行 Space 定向测试、前端类型检查和 workspace 校验，更新相关文档。

验收：旧 Space 生产调用无残留；前端路由 scope 与后端默认 Space 规则一致。

## 阻塞

- R2 未完成。
- 项目与任务的细节实现属于 R4/R5；本任务只定义必要的级联契约。

## 与 SPEC 的实施偏差

无。

## 完成记录

- 完成日期：
- 已更新的长期文档：
- 遗留技术债：
