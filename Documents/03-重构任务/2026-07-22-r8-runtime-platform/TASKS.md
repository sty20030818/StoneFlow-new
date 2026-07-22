# R8 Runtime 与 Platform - Tasks

## 当前阶段

未开始。依赖 R7；本任务接入桌面平台能力和前端 transport，不改变 domain/application 已确定的业务规则。

## 阶段一：完成 Runtime Composition 与命令薄层

目标：让 runtime 成为唯一 Tauri composition root，command 保持可审计的薄 transport。

- [ ] 建立最终 `AppState`、composition、生命周期 shutdown 与稳定 `AppError`/错误码映射。
- [ ] 将 Space、Project、Task、View、Activity command 改为解析输入、调用 application、返回 DTO 的薄函数。
- [ ] 删除 command 对 Repository、SeaORM transaction、sync payload 与 concrete storage type 的直接访问。
- [ ] 为 command 装配、错误码映射和参数校验建立定向测试。

验收：Tauri command 不含业务决策或 SQL；应用启动只通过新 composition 装配依赖。

## 阶段二：接入 Launcher 与桌面生命周期

目标：让应用外 Launcher 和主应用创建共享业务接口，但保留各自的 UI/session 边界。

- [ ] 将 Launcher 创建与最近浏览/默认 Space 解析迁到 application service，复用 Task 创建契约。
- [ ] 接回 tray、shortcut、single-instance、窗口显示/退出和启动恢复，保证它们只调用 runtime/platform adapter。
- [ ] 定义程序退出时的同步收尾与资源释放，不在 UI thread 等待无界网络操作。
- [ ] 覆盖 Launcher 默认值、窗口生命周期与单实例消息的定向测试。

验收：Launcher 与主应用不会拥有两套 Task 创建逻辑；平台事件不穿透到领域层。

## 阶段三：连接凭证、同步状态与更新能力

目标：把操作系统能力封装在 platform adapter，避免业务模块依赖 Keychain 或 Tauri event。

- [ ] 实现 Keychain credential adapter 和配置读取边界，处理不可用/拒绝访问错误。
- [ ] 将 sync engine 最小状态桥接为 Tauri event/setting query；设置页是唯一同步状态 surface。
- [ ] 迁移 updater adapter，保持其与业务数据、Task/Project 事务及同步协议无耦合。
- [ ] 覆盖凭证失败、sync status event、手动触发和 updater 初始化测试。

验收：token 从不进入前端 DTO 或日志；同步状态和 updater 都通过 platform/runtime 边界访问。

## 阶段四：迁移前端 transport 与删除旧 services

目标：让前端调用和错误展示对齐新 DTO，同时结束 `runtime/services` 作为第二业务层的历史。

- [ ] 更新前端 API facade、DTO type、Query keys、mutation invalidation 和错误展示。
- [ ] 验证 Task/Project 创建编辑、批量、归档删除、View 查询、Launcher 和同步状态的前后端契约。
- [ ] 检索并删除 `runtime/services` 的所有生产调用、旧 invoke 命令和兼容 DTO。
- [ ] 运行前端 typecheck/lint/测试和 Rust workspace 校验，更新架构与模块 README。

验收：前端不存在旧 invoke contract；runtime/services 不再是生产路径；跨层边界与文档一致。

## 阻塞

- R7 未完成。
- 移动端、账号系统和提醒通知机制不属于 runtime 接入范围，保留为未来产品任务。

## 与 SPEC 的实施偏差

无。

## 完成记录

- 完成日期：
- 已更新的长期文档：
- 遗留技术债：
