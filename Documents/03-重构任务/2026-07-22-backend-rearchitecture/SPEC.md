# 后端架构与本地优先同步重构 - Spec

## 背景与目标

StoneFlow 的前端与文档库已完成当前阶段的结构收口，但 Rust 后端仍存在旧模型、同步 sidecar、运行时直接访问 Repository、重复同步 payload 和超大服务文件等问题。当前同步一次上传和下载可能超过一分钟，不能满足单人多设备的无感体验。

本任务以可舍弃旧本地 SQLite 与 Turso 数据为前提，重建领域模型、SQLite schema、同步协议、Rust workspace 与 Tauri 运行时边界。目标是让本地操作即时完成、同步在后台可靠运行，并让每个模块有清晰且可删除的职责。

## 范围

- 备份现有本地 SQLite 与远端 Turso 数据，再硬切到新 schema 与协议。
- 重建 Space、Project、Task、View、Activity、排序、生命周期和批量操作的数据模型。
- 使用同进程同步库替换 `sync-worker` sidecar 与 CLI JSON 通讯。
- 重构 Rust workspace 为 `domain / application / storage / sync / platform / runtime / test-support`。
- 合并 `schema`、`migration` 到 `storage`；移除 `integration-tests` 独立 host crate。
- 删除 `runtime/services`，使 Tauri command 保持为 transport 边界。
- 建立 SQLite、同步、日志、错误、性能与测试的长期基线。
- 在实现完成后同步根架构、`src-tauri` 架构、A1、A2 与受影响模块文档。

## 不做什么

- 不保留旧 API、旧 schema、旧本地数据或旧同步协议兼容层。
- 不实现账号系统、团队协作、附件、知识库、提醒投递、移动端、导出、自动备份、云端遥测或崩溃上报。
- 不引入 CRDT、写入队列、自定义 ORM、FTS5、插件体系或为未来移动端预建 trait。
- 不把 Turso Embedded Replica 或原生 Turso Sync 作为本次基础设施；继续使用受控的逻辑同步协议。

## 已确认需求

### 领域模型

- Space 扁平；Project 无层级且属于一个 Space；Task 必属 Space、可选属同一 Space 的 Project；Inbox 移除。
- Task 与 Project 嵌入共享 `WorkState`：状态（待执行、进行中、等待中、已完成、已取消）、优先级（无、低、中、高、紧急）、计划/截止/提醒三个可选 UTC 时间戳。
- 状态允许手动任意切换，维护 `status_changed_at`；从已完成回到非终态时清空 `completed_at`，Activity 保留历史。
- Project 不从子 Task 推导状态、优先级或时间，全部手动维护。
- Project 在 Space 内排序；Task 在所属 Project 或 Space 的独立待办容器中排序。
- 全部任务是固定路由；系统 View 由代码定义；自定义 View 才持久化 `scope + filters + sort + group_by`，不缓存 Task ID。
- TaskLink 仅保存 URL 与标题。

### 生命周期、Activity 与批量操作

- Space/Project 的归档或删除级联其内容；恢复只恢复本次操作影响的对象、原层级和原排序位置。
- 默认 Space 不允许归档或删除；若要移除当前默认 Space，必须先将其他活跃 Space 设为默认。非默认 Space 归档或删除后，前端回到当前默认 Space 的任务页。
- 批量操作只能选同类型实体，必须在一个本地事务中全成或全败。
- Activity 只记录 Task 与 Project 的用户可理解操作；描述只记“已修改描述”，不保存正文；排序、同步、迁移和自动维护不写 Activity。Space 仅作为个人容器，不记录 Activity。
- Activity 作为原操作的一部分同步；永久删除 Task 时删除其链接与 Activity。
- 删除 Toast 的撤销是新的 restore 操作，不取消已发出的同步。

### 同步一致性与删除

- 本地操作在一个 SQLite 事务中写实体、Activity、级联记录和 Outbox，并携带 `operation_id`。
- mutation 是字段 patch；不同字段并发自动合并，同字段以服务端单调 sequence 的 LWW 为准。
- 生命周期操作优先于普通字段 patch；恢复是新的显式操作。
- 活跃实体物理删除；同步层保留最小 tombstone（类型、ID、generation、删除 sequence）和有限期 change log。
- 游标过期或新设备走全量基线；长期离线设备的过期 patch 被拒绝，再拉取删除事件或基线，不得复活已删除对象。
- 远端操作按 `operation_id` 幂等提交；批量操作在远端也原子提交。

### 同步性能与调度

- 同步引擎同进程运行，单飞并合并触发；启动、恢复前台、本地写入防抖、前台定期检查和手动重试复用同一入口。
- 同步永不阻塞本地 UI 或本地 CRUD；网络 I/O 不在 SQLite 事务中执行。
- 连续普通编辑可在 Outbox 发送前合并为最终 patch；Activity 不合并。
- 一轮同步复用远端连接，按 push 后 pull 的顺序执行；不并行 push/pull。
- 正常同步只使用 Outbox 与 cursor delta；全量基线只用于首次、新设备或日志过期。
- 记录 Outbox 读取、远端 push、远端 pull、本地应用四段耗时，以事实调优批次与索引。
- 网络失败指数退避，最大 5 分钟；本地写入、恢复前台和手动重试可重新触发；鉴权、schema、baseline 错误进入“需要处理”。

### 存储、运行时与可观测性

- 保留 SeaORM + SQLite 小连接池（上限 5），使用 WAL；每条连接初始化外键、busy timeout 与同步级别。
- 默认 `synchronous = FULL`，用户操作采用短事务；索引基于实际查询和 `EXPLAIN QUERY PLAN` 增加。
- 不新增写队列、FTS5 或连接池扩容；出现实际慢查询或 `SQLITE_BUSY` 后再基于日志处理。
- `runtime` command 仅做 DTO 转换、调用 application 和返回稳定错误；普通 CRUD 不用 event 充当数据真相。
- `domain / application / storage / sync` 不依赖 Tauri；平台能力不依赖业务或数据库。
- 使用 `thiserror` 保留错误来源，runtime 映射为稳定错误码；结构化 `tracing` 记录操作和耗时，不记录 token、完整 SQL 参数、任务正文或数据库快照。
- 日志本地滚动，最多保留 14 天或 20MB；不上传遥测。

## 当前技术方案

### Workspace

```text
src-tauri/crates/
├── domain/        纯领域规则和值对象
├── application/   用例、DTO、ports
├── storage/       SQLite、SeaORM entity、migration、repository、outbox
├── sync/          同进程逻辑同步与 Turso 协议
├── platform/      窗口、快捷键、托盘、Keychain、Updater
├── runtime/       Tauri commands、composition、事件、调度
└── test-support/  临时数据库与共享测试工具
```

- `usecase` 改名 `application`。
- `schema`、`migration` 合并进 `storage`。
- `sync-worker` 改为 `sync` library，不再产出独立 binary。
- `integration-tests` 合并到相关 crate 的 `tests/`，跨边界测试放 `runtime/tests/`。
- 不创建 `core`、`common`、`utils` 等泛化 crate。

### 依赖边界

```text
runtime -> application, storage, sync, platform
application -> domain
storage -> application ports, domain
sync -> application ports, storage, domain
platform -> Tauri / OS API
```

`runtime` 是唯一组合层。Storage 与 Sync 作为 application port 的实现依赖 application 的接口，但 application 不依赖它们的具体实现。

### 验证策略

- domain：纯单元测试覆盖状态、时间、排序和生命周期规则。
- application + storage：临时 SQLite 集成测试覆盖事务、级联、约束、Outbox 和批量原子性。
- sync：临时本地/远端库验证幂等、LWW、长期离线删除、恢复、游标过期与全量基线。
- runtime：少量 command 装配与 Tauri 边界测试，不重复业务规则。
- CI/收尾使用 `cargo fmt --check`、严格 Clippy、workspace tests，以及前端根 Bun 校验。

## 验收标准

- 旧 SQLite/Turso 数据在重建前已完成可恢复备份，运行时不再读取旧 schema。
- Cargo workspace 仅保留目标 crate，`sync-worker`、`schema`、`migration`、`integration-tests` 与 `runtime/services` 无生产残留。
- Task/Project/Space/WorkState/View/Activity 的实现符合本 Spec 的字段、关系和生命周期规则。
- 单操作与批量操作在本地和远端均以 `operation_id` 原子、幂等处理。
- 删除、恢复、长期离线设备、游标过期和失败重试均有自动化覆盖。
- 同步不再启动外部 binary，不再走 stdout/stderr JSON；正常增量同步不做全量快照。
- SQLite 每条池连接均已配置必要 PRAGMA；事务不包含网络等待。
- 结构化日志、稳定错误码和同步状态符合本 Spec，且不泄露敏感信息。
- `cargo fmt --check`、严格 Clippy、Rust workspace tests、`bun typecheck`、`bun lint`、`bun format:check` 和定向前端测试通过。
- 实现后，根架构、`src-tauri/ARCHITECTURE.md`、A1、A2、相关模块 README/ARCHITECTURE/DESIGN 与代码一致。

## 关联模块

- `src-tauri/`
- `src/features/{task,project,space,view,activity,launcher,sync}/`
- `src/shared/`
- `Documents/01-架构/A1-领域模型.md`
- `Documents/01-架构/A2-系统设计.md`

## 风险

- 这是破坏性重构，旧数据不迁移；备份失败或远端 schema 误操作会造成数据不可恢复。
- 同步协议需要同时保证本地事务、远端幂等、删除语义和 Activity，不能以单元测试替代端到端验证。
- Turso 网络质量影响首次基线时长；常规同步的性能必须通过阶段日志验证。
- 新领域模型会迫使前端 DTO、查询与路由边界同步改变，不能只完成 Rust 编译就宣告完成。

## 完成后需要同步的长期文档

- 根 `ARCHITECTURE.md`
- `src-tauri/README.md`
- `src-tauri/ARCHITECTURE.md`
- `src-tauri/crates/{domain,application,storage,sync,platform,runtime}/README.md`
- 触发条件成立的模块 `ARCHITECTURE.md` 与 `DESIGN.md`
- `Documents/01-架构/A1-领域模型.md`
- `Documents/01-架构/A2-系统设计.md`
- `Documents/_INDEX.md`
