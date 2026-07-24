# R1 Workspace 与架构边界 - Tasks

## 当前阶段

已完成。Workspace 已收敛为目标 crate 布局；旧 sidecar / schema / migration / integration-tests 已移除。`runtime/services` 仍为过渡入口，交由后续纵切与 R9 清理。

## 阶段一：收口 Workspace 与依赖方向

目标：建立长期 workspace 形态，并让每个 crate 的职责可由依赖图直接判断。

- [x] 将 `usecase` 重命名为 `application`，同步 Cargo package、workspace member、内部 import 与测试路径。
- [x] 建立并确认最终 crate：`domain`、`application`、`storage`、`sync`、`platform`、`runtime`、`test-support`。
- [x] 迁移依赖声明，使 `domain` 不依赖基础设施，`application` 只依赖 `domain`，`storage`/`sync` 实现能力，`runtime` 只负责装配与 Tauri transport。
- [x] 从 workspace member 移除旧 `sync-worker`、`schema`、`migration`、`integration-tests` crate；不要保留名称兼容或转发 crate。
- [x] 为新 crate 补齐最小 README，写明职责、公开入口与禁止依赖方向。

验收：`cargo metadata --no-deps` 仅含目标 crate；`domain/application/storage/sync` 不含 Tauri。

## 阶段二：将存储基础设施并入 storage

目标：让 schema、migration、连接配置和持久化测试有唯一 Owner。

- [x] 将旧 schema 与 migration 实现迁入 `storage`，由 storage 对外暴露明确的初始化入口。
- [x] 让 migration 只描述当前 schema；不设计旧数据库在线升级或双 schema 兼容路径。
- [x] 将 SQLite PRAGMA 配置放在每个物理连接建立时执行（`map_sqlx_sqlite_opts`）。
- [x] 固化 SQLite 基线：WAL、小连接池（最大 5）、`synchronous = FULL`、busy timeout；禁止网络请求持有数据库事务。
- [x] 将数据库测试工具继续留在 `test-support`；生产 crate 不依赖测试 crate。
- [x] 为连接配置建立定向测试（`connection_pragma_tests`）。

验收：新空 SQLite 可初始化；PRAGMA 测试通过；migration/schema 无独立 crate。

## 阶段三：建立 Runtime Composition、日志与错误基线

目标：让 runtime 只做装配和 transport，避免 Tauri command 重新变成业务与 SQL 汇聚点。

- [x] 维持 `composition` 作为装配入口；完整统一 `AppState` 外壳延后到业务纵切时逐步收口（见遗留技术债）。
- [x] Tauri command 继续经 composition/application 路径；禁止新增直接 repository/SQL 调用。
- [x] 接入本地滚动日志：`max_file_size=20MB`，`KeepSome(14)`。
- [x] 统一 `thiserror` 错误链；sync 错误在 runtime 映射为稳定 `AppError`。
- [x] 日志脱敏基线：不记录 token；完成记录与 README 明确禁止写入任务正文/SQL 参数。
- [x] 冻结 `runtime/services`：标注为过渡入口，禁止新增调用路径。

验收：应用可编译启动路径保持；services 已标注过渡。

## 阶段四：边界审计与工作区验证

目标：在进入业务重写前清除旧架构残留，避免新旧路径并行生长。

- [x] 删除旧 `sync-worker` sidecar、CLI、stdout JSON 协议、`externalBin` 与 build.rs sidecar 构建。
- [x] 搜索确认旧 schema/migration/usecase/sync-worker 无生产 import。
- [x] 运行 `cargo fmt --check`、严格 Clippy、关键 crate tests。
- [x] 更新 `src-tauri/ARCHITECTURE.md` 已落地边界说明。

验收：workspace 校验通过；旧生产路径无引用。

## 阻塞

无。

## 与 SPEC 的实施偏差

1. **未新建统一 `AppState` 外壳**：现有多 State + composition 继续工作；统一收口放到后续纵切，避免本任务扩大业务迁移面。
2. **`runtime/services` 仍保留为过渡 adapter**：符合 SPEC“临时保留须标记”要求，R9 删除。
3. **未引入完整 `tracing` subscriber 替换**：继续使用 `tauri-plugin-log` + `log` 门面，并配置滚动策略；结构化 tracing 字段基线留给后续可观测性细化。
4. **`storage` 目录未强制改为 `sqlite/{...}` 子树**：entities/migration 已并入 storage；更深目录重排无功能收益，延后以免无意义 diff。

## 完成记录

- 完成日期：2026-07-22
- 已更新的长期文档：
  - `src-tauri/ARCHITECTURE.md`（v8）
  - 各目标 crate README
- 验证：
  - `cargo metadata --no-deps` members = application/domain/platform/runtime/storage/sync/test-support + root
  - `cargo fmt --check` 通过
  - `cargo clippy --workspace --all-targets --locked -- -D warnings` 通过
  - `cargo test -p stoneflow-storage --test connection_pragma_tests` 通过
  - `cargo test -p stoneflow-application -p stoneflow-domain -p stoneflow-sync` 通过
  - `cargo test -p stoneflow-runtime --lib database_bootstrap` 通过
- 遗留技术债：
  - `runtime/services` 过渡层待 R9 删除
  - 统一 `AppState` 与 command 彻底去 repository 穿透待纵切推进
  - Windows 上 libsql 与本地 SQLite 同进程链接风险需在真机验证（原 sidecar 隔离动机）
  - ARCHITECTURE.md 后半旧段落可能仍含历史表述，后续文档任务继续对齐
