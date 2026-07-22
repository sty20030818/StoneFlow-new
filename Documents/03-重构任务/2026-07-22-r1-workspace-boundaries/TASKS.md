# R1 Workspace 与架构边界 - Tasks

## 当前阶段

未开始。R0 的本地与远端数据备份可恢复后开始；本任务完成后，后续业务模块只能建立在新的 crate 边界上。

## 阶段一：收口 Workspace 与依赖方向

目标：建立长期 workspace 形态，并让每个 crate 的职责可由依赖图直接判断。

- [ ] 将 `usecase` 重命名为 `application`，同步 Cargo package、workspace member、内部 import 与测试路径。
- [ ] 建立并确认最终 crate：`domain`、`application`、`storage`、`sync`、`platform`、`runtime`、`test-support`。
- [ ] 迁移依赖声明，使 `domain` 不依赖基础设施，`application` 只依赖 `domain` 定义的端口，`storage`/`sync` 实现端口，`runtime` 只负责装配与 Tauri transport。
- [ ] 从 workspace member 移除旧 `sync-worker`、`schema`、`migration`、`integration-tests` crate；不要保留名称兼容或转发 crate。
- [ ] 为新 crate 补齐最小 README，写明职责、公开入口与禁止依赖方向。

验收：`cargo metadata --no-deps` 不再列出被移除 crate；依赖图中 `domain/application/storage/sync` 不含 Tauri；旧 `usecase` package 不再可被引用。

## 阶段二：将存储基础设施并入 storage

目标：让 schema、migration、连接配置和持久化测试有唯一 Owner。

- [ ] 将旧 schema 与 migration 实现迁入 `storage`，由 storage 对外暴露明确的初始化入口。
- [ ] 让 migration 只描述新 schema；不设计旧数据库在线升级或双 schema 兼容路径。
- [ ] 将 SQLite PRAGMA 配置放在每个物理连接建立时执行，保证池内所有连接一致，而不是只配置初始连接。
- [ ] 固化 SQLite 基线：WAL、小连接池（最大 5）、`synchronous = FULL`、短事务；禁止网络请求持有数据库事务。
- [ ] 将数据库测试工具、临时库和 fixture 收到 `test-support`；生产 crate 不依赖测试 crate。
- [ ] 为连接配置、空库建表与迁移幂等性建立定向测试。

验收：新空 SQLite 可以独立初始化；连接池中的多连接都满足 PRAGMA 约束；migration/schema 不再有独立 crate 或重复入口。

## 阶段三：建立 Runtime Composition、日志与错误基线

目标：让 runtime 只做装配和 transport，避免 Tauri command 重新变成业务与 SQL 汇聚点。

- [ ] 定义新的 `AppState`，仅持有 application service、必要 platform adapter 与 runtime-owned 生命周期资源。
- [ ] 让 Tauri command 只负责解析输入、调用 application service、映射稳定错误码和返回 DTO；禁止直接调用 repository、SQL 或 sync engine。
- [ ] 接入结构化 `tracing`，配置本地滚动日志，保留 14 天或单文件达到 20MB 后轮转。
- [ ] 统一 `thiserror` 错误链；错误日志保留技术原因，前端只收到稳定且可本地化的用户错误码。
- [ ] 落实日志脱敏：不得写入 token、SQL 参数、任务正文或数据库快照。
- [ ] 冻结 `runtime/services` 旧生产调用路径：迁移调用方或删除，不让新代码继续增加入口。

验收：应用可由新 composition 启动；典型 command 不直接依赖 storage/sync concrete type；故意失败的存储操作能记录源错误链且返回稳定错误码。

## 阶段四：边界审计与工作区验证

目标：在进入业务重写前清除旧架构残留，避免新旧路径并行生长。

- [ ] 搜索并删除旧 `sync-worker` 协议、stdout JSON、sidecar 启动和对应依赖。
- [ ] 搜索并处理 `runtime/services`、旧 schema/migration crate、旧 `usecase` 的生产 import。
- [ ] 检查所有 crate 的公开 API，避免 runtime 穿透 application 访问 repository 实现。
- [ ] 运行 Rust workspace format、clippy、test/check；记录现存且与本任务无关的失败原因。
- [ ] 更新本任务 SPEC 中列出的长期架构文档，只记录已落地的边界。

验收：workspace 构建、lint 与测试通过；旧生产路径无引用；架构文档和实际 crate 布局一致。

## 阻塞

- R0 未完成前不得删除旧数据读取路径或执行破坏性数据库初始化。
- 若现有 Tauri command 无法在不扩大业务范围的情况下迁移，先在本任务记录边界缺口，再交由对应业务任务完成。

## 与 SPEC 的实施偏差

无。

## 完成记录

- 完成日期：
- 已更新的长期文档：
- 遗留技术债：
