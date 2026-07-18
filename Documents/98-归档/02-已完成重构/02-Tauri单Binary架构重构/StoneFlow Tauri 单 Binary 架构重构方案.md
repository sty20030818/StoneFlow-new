# StoneFlow Tauri 单 Binary 架构重构方案

> 版本：v2.0  
> 状态：破坏性重构完整方案  
> 最后更新：2026-06-14  
> 适用范围：`src-tauri`、Quick Create 独立窗口、主窗口生命周期、Tauri commands、capabilities、打包配置、Rust workspace  
> 架构真源：`src-tauri/ARCHITECTURE.md`  
> 关联文档：
> - `d:\Desktop\StoneCache\Documents\T2-Tauri单Binary架构规范.md`
> - `Docs/重构方案/快捷创建全局弹窗方案/StoneFlow Helper 生命周期长期方案.md`
> - `Docs/重构方案/快捷创建全局弹窗方案/StoneFlow Quick Create 开发实施方案.md`

---

## 0. 核心结论

StoneFlow 应迁移到：

```txt
单 Tauri binary
+ 单 React 前端
+ Main / Quick 多 WebView window
+ runtime / platform / domain / usecase / storage / schema / migration / testing
+ Tauri command 边界
+ 按窗口最小 capabilities
+ 删除 helper / Local IPC / supervisor
```

这不是对当前 `desktop-app + core + helper` 的优化版，而是按单 Binary 重新设计 Rust workspace。当前 crate 只是迁移来源，不作为目标约束。

最终目标：

```txt
StoneFlow = 一个 Tauri desktop app
runtime = Tauri 外壳
platform = 桌面窗口平台能力
domain = 业务规则
usecase = 用例编排
storage = 数据库和外部适配
schema = 数据库映射
migration = schema 演进
testing = 测试基础设施
```

必须保留的用户可见能力：

1. 主窗口启动、隐藏、恢复、托盘退出。
2. single-instance 第二次启动聚焦主窗口。
3. 全局快捷键唤起 Quick Create。
4. Quick Create 打开即聚焦。
5. Quick Create 搜索、创建、创建并打开、连续创建。
6. Quick Create 失焦关闭、Esc 关闭、提交关闭。
7. 创建后主窗口刷新并能打开对应任务。
8. 退出后无 helper 残留进程，因为 helper 不再存在。

---

## 1. 方案取代关系

### 1.1 取代旧双 Tauri 方案

旧方案：

```txt
stoneflow main binary
  -> desktop-app
  -> database / service / main window / IPC server / helper supervisor

stoneflow-helper binary
  -> helper-app
  -> global shortcut / Quick window / Local IPC client
```

新方案：

```txt
stoneflow single binary
  -> runtime
  -> Main window / Quick window / commands / tray / shortcut
  -> usecase
  -> storage
  -> SQLite
```

旧 `StoneFlow Helper 生命周期长期方案.md` 中“继续双进程”的结论被本方案取代。该旧文档只作为历史背景参考，不再作为后续实现依据。

### 1.2 取代旧 crate 心智模型

旧目标不再采用：

```txt
desktop-app = 业务真源
core = 技术基础层或业务核心
helper-app = Quick 输入入口
ipc-protocol = 主/helper 协议
```

新目标：

```txt
runtime = Tauri adapter
platform = desktop platform adapter
domain = pure business rules
usecase = application orchestration
storage = repository implementation
schema = SeaORM entity
migration = schema evolution
testing = test utilities
```

### 1.3 不做 POC / 双轨灰度

用户已明确接受破坏性重构，并要求所有功能完整保留。因此本方案不安排 POC，也不设计长期灰度双轨。

允许开发过程中存在短期编译中间态，但最终交付必须满足：

```txt
生产路径只有单 Tauri binary
Quick Create 只走 runtime commands
仓库中没有 helper 生产代码
workspace 使用方案 A crate 拓扑
```

---

## 2. 当前事实

当前主应用入口：

```txt
src-tauri/src/main.rs
src-tauri/src/lib.rs
src-tauri/crates/desktop-app/src/app/mod.rs
```

当前 helper 入口：

```txt
src-tauri/helper-bin
src-tauri/crates/helper-app
```

当前跨进程协议：

```txt
src-tauri/crates/ipc-protocol
src-tauri/crates/desktop-app/src/app/helper_runtime.rs
src-tauri/crates/helper-app/src/ipc_client.rs
```

当前 Quick Create 前端 facade：

```txt
src/features/quick-create/api/quickCreate.ts
```

当前 Rust workspace 中旧边界：

```txt
crates/core
crates/desktop-app
crates/entity
crates/helper-app
crates/ipc-protocol
crates/migration
crates/test-support
helper-bin
```

这些都是迁移来源，不是目标结构。

### 2.1 S0 基线结论（2026-06-14）

当前事实已经通过实测冻结：

1. `git status --short` 只有既有的 `package.json`、`bun.lock` 改动。
2. `cargo metadata --no-deps` 显示 workspace 仍包含 `stoneflow-core`、`desktop-app`、`stoneflow-entity`、`stoneflow-ipc-protocol`、`stoneflow-migration`、`stoneflow-test-support`、`stoneflow-helper-app`、`stoneflow-helper`、`stoneflow`。
3. 根 crate `stoneflow` 仍直接依赖 `desktop-app`，还没有 `runtime` 入口层。
4. `desktop-app` 仍依赖 `interprocess`、`stoneflow-ipc-protocol`、`stoneflow-entity`、`stoneflow-migration`。
5. `helper-app` 仍依赖 `interprocess` 和 `stoneflow-ipc-protocol`。
6. `migration` 当前仍依赖 `entity`，还没有切到 `schema`。
7. Quick Create 前端 facade `src/features/quick-create/api/quickCreate.ts` 仍全量调用 `helper_quick_*` 命令。
8. helper 命令注册和窗口生命周期仍位于 `src-tauri/crates/helper-app/src/lib.rs`、`commands/domain.rs`、`commands/window.rs`、`commands/diagnostics.rs`。

这说明当前仓库离单 Binary 目标还有三层真实耦合未解除：

```txt
构建耦合：workspace 仍构建 helper-bin / helper-app / ipc-protocol
运行时耦合：Quick Create 仍依赖 helper runtime 和本地 IPC 协议
命名耦合：前端 API 仍把 helper 当作真实后端边界
```

### 2.2 当前自动化基线

S0 实测基线如下：

```txt
bun run typecheck                              PASS
bun run test:run                              PASS (111 files, 604 tests)
cargo check --manifest-path src-tauri/Cargo.toml   PASS
cargo test --manifest-path src-tauri/Cargo.toml --workspace   FAIL
```

唯一既有 Rust 失败是：

```txt
desktop-app
tests::database_bootstrap_tests::database_bootstrap_should_create_sqlite_and_report_ready
```

错误信号：

1. 断言 `left = 2, right = 1`。
2. Windows 临时目录清理失败，附带 `os error 32`。

这条失败在重构前已经存在，后续所有阶段都必须把它视为已知残留，而不是迁移回归。

---

## 3. 目标架构

### 3.1 Workspace

```txt
src-tauri/
├─ src/
│  ├─ main.rs
│  └─ lib.rs
├─ crates/
│  ├─ runtime/
│  ├─ platform/
│  ├─ domain/
│  ├─ usecase/
│  ├─ storage/
│  ├─ schema/
│  ├─ migration/
│  └─ testing/
├─ capabilities/
├─ tauri.conf.json
└─ Cargo.toml
```

### 3.2 依赖方向

```txt
root crate
  -> runtime

runtime
  -> usecase
  -> storage
  -> platform
  -> tauri / tauri plugins

platform
  -> tauri
  -> OS bindings

usecase
  -> domain

storage
  -> usecase
  -> domain
  -> schema
  -> migration
  -> sea-orm

migration
  -> schema
  -> sea-orm-migration

schema
  -> sea-orm

testing
  -> domain / usecase / storage / migration
```

禁止：

```txt
domain -> tauri / sea-orm / runtime
usecase -> tauri / storage implementation / runtime
storage -> runtime
schema -> domain / usecase
生产代码 -> testing
```

---

## 4. 模块边界

### 4.1 `runtime`

职责：

1. 组装 Tauri Builder。
2. 注册插件和 commands。
3. 管理主窗口、Quick 窗口、托盘、全局快捷键。
4. 持有 Tauri state、exit coordinator、pending open intent。
5. 处理 command DTO 与 usecase DTO 的转换。
6. 发出 Tauri event。
7. 调用 `platform` 做窗口平台行为。

不做：

1. 不写业务规则。
2. 不直接写复杂 SQL。
3. 不定义领域模型。
4. 不把 Tauri 类型传进 `domain` / `usecase`。

### 4.2 `platform`

职责：

1. macOS NSPanel / AppKit bridge。
2. Windows floating window、focus、blur、position。
3. Quick window `prepare_hidden / apply_height / present / hide`。
4. 多显示器和平台差异封装。

不做：

1. 不知道 task/project/space。
2. 不查数据库。
3. 不调 usecase。
4. 不发业务事件。

### 4.3 `domain`

职责：

1. 领域模型和值对象。
2. 领域状态机和不变量。
3. 领域错误。
4. 不依赖 I/O 的领域服务。

不做：

1. 不依赖 Tauri。
2. 不依赖 SeaORM。
3. 不知道 command DTO、window label、frontend route。

### 4.4 `usecase`

职责：

1. 应用用例编排。
2. repository trait / ports。
3. transaction 边界抽象。
4. Quick Create、create-and-open、open target resolve 等流程。
5. usecase DTO。

不做：

1. 不依赖 Tauri。
2. 不依赖 SeaORM implementation。
3. 不创建窗口。
4. 不发 Tauri event。

### 4.5 `storage`

职责：

1. SQLite 连接与初始化。
2. SeaORM repository implementation。
3. migration runner。
4. settings/store 文件适配。
5. 领域模型与 SeaORM model 映射。

不做：

1. 不依赖 Tauri window。
2. 不承载领域规则。
3. 不把 SeaORM model 泄漏到 usecase 公共 API。

### 4.6 `schema`

只负责 SeaORM entity、relation、数据库字段结构。

`schema` 是数据库形状，不是业务模型。

### 4.7 `migration`

只负责 schema 演进、索引、外键、约束和 migration runner 所需最小 glue。

### 4.8 `testing`

只负责临时数据库、fixture builder、测试数据工厂和测试 helper。生产代码不得依赖。

---

## 5. 运行时模型

启动目标顺序：

```txt
run()
  -> runtime::run()
    -> register Tauri plugins
    -> build storage runtime
    -> run database bootstrap / migration
    -> build usecase services
    -> manage runtime state
    -> create main window
    -> create hidden quick window
    -> register global shortcut
    -> setup tray
    -> invoke_handler(commands::handler())
```

Quick Create 打开：

```txt
global shortcut
  -> runtime::shortcuts
  -> QuickWindowRuntime.begin_open()
  -> platform.prepare_hidden()
  -> usecase.quick_create.get_initial_state()
  -> runtime.emit_to("quick", "quick-create:session-prepared")
  -> frontend measure
  -> quick_create_commit_layout
  -> platform.apply_height()
  -> quick_create_present_session
  -> platform.present()
```

Quick Create 创建：

```txt
frontend
  -> src/features/quick-create/api/quickCreate.ts
  -> invoke("quick_create_create")
  -> runtime command
  -> usecase quick_create create
  -> storage repository
  -> SQLite
  -> runtime emits stoneflow://tasks/changed
```

---

## 6. Quick Window 生命周期

建议状态：

```txt
Booting
Idle
Preparing
WaitingLayout
Presenting
Open
Closing
Error
ShuttingDown
```

必须保留现有稳定链路：

```txt
prepare hidden
  -> frontend measure
  -> commit layout
  -> present
  -> close / invalidated
```

不能简化成“快捷键直接 show”，否则会回归布局闪动、焦点时序和高度测量问题。

`frontend_ready` 概念应保留。Quick window 是隐藏预创建，WebView 存在不等于前端 bridge 已注册监听。

---

## 7. Tauri Commands

旧命名：

```txt
helper_quick_get_initial_state
helper_quick_search
helper_quick_create
```

新命名：

```txt
quick_create_get_initial_state
quick_create_list_projects_by_space
quick_create_search
quick_create_create
quick_create_create_and_open
quick_create_open_target
quick_create_prepare_session
quick_create_commit_layout
quick_create_present_session
quick_create_close_session
quick_create_frontend_ready
quick_create_frontend_unready
quick_create_report_layout_diagnostics
```

Command 只做：

1. 接收 DTO。
2. 获取 `State<T>`。
3. 调用 usecase 或 window runtime。
4. 返回可序列化 DTO 或错误。

Command 不做：

1. 不拼 SQL。
2. 不直接写业务规则。
3. 不直接持久化 UI 状态。
4. 不把 Tauri 类型传给 usecase。

---

## 8. 事件模型

保留事件：

```txt
quick-create:session-prepared
quick-create:session-invalidated
quick-create:focus-input
stoneflow://tasks/changed
stoneflow://command/open
```

原则：

1. 事件是通知，不是数据真源。
2. 大对象不广播。
3. 多窗口监听必须清理 unlisten。
4. 主窗口不在线时，重要 open intent 应有 pending buffer。

---

## 9. Capabilities 与权限

目标按窗口拆 capability：

```txt
main-capability
quick-capability
```

原则：

1. 不使用 `windows: ["*"]` 作为最终方案。
2. Main 只拿主工作台所需插件权限。
3. Quick 只拿 Quick Create 所需 core/event/window 权限。
4. global shortcut 由 Rust 后端统一注册。
5. 权限名称以当前 `src-tauri/gen/schemas` 和 lockfile 中插件版本为准。

---

## 10. 打包与依赖清理

删除：

```txt
src-tauri/helper-bin/
src-tauri/crates/helper-app/
src-tauri/crates/ipc-protocol/
src-tauri/crates/desktop-app/
src-tauri/crates/core/
src-tauri/crates/entity/
src-tauri/crates/test-support/
scripts/bundle-helper.sh
```

新增或迁移为：

```txt
src-tauri/crates/runtime/
src-tauri/crates/platform/
src-tauri/crates/domain/
src-tauri/crates/usecase/
src-tauri/crates/storage/
src-tauri/crates/schema/
src-tauri/crates/migration/
src-tauri/crates/testing/
```

从 workspace dependencies 删除：

```txt
interprocess
stoneflow-ipc-protocol
```

如果某些 DTO 仍有复用价值：

1. 业务类型迁入 `domain` 或 `usecase`。
2. IPC 边界类型迁入 `runtime::commands`。
3. SeaORM 类型迁入 `schema` 或 `storage`。

---

## 11. 性能与可靠性

Quick 打开目标：

```txt
全局快捷键 -> 输入可用 < 200ms
```

策略：

1. App setup 后预创建隐藏 Quick WebView。
2. Quick route 保持轻量。
3. 快捷键触发只做 prepare/show/focus，不做重型初始化。
4. 初始上下文查询失败不展示空窗口。
5. 搜索使用 latest-only / request id，避免旧结果覆盖新结果。
6. command 不阻塞主线程；数据库 I/O 保持 async。

单 Binary 风险：

```txt
Core 崩溃会影响 Main 和 Quick
```

应对：

1. 生产代码避免 `unwrap()` / `expect()`。
2. command 返回 `Result<T, E>`。
3. Quick 输入保留 pending draft。
4. Quick window 异常时尝试重建 WebView。

---

## 12. 验收标准

### 12.1 架构验收

1. `cargo metadata` 不再包含旧 `desktop-app`、`stoneflow-core`、`helper-app`、`ipc-protocol`、`helper-bin`。
2. workspace 包含 `runtime / platform / domain / usecase / storage / schema / migration / testing`。
3. 代码中不再存在生产路径 Local IPC server/client。
4. `interprocess` 依赖删除。
5. `beforeBundleCommand` 不再构建 helper。
6. Quick 前端调用的 command 不再以 `helper_` 开头。
7. `domain` / `usecase` 不依赖 Tauri。
8. `schema` 不承载领域规则。

### 12.2 功能验收

1. 主窗口启动正常。
2. 主窗口关闭按钮只隐藏。
3. 托盘显示/隐藏主窗口正常。
4. 托盘退出完整退出。
5. 第二次启动聚焦主窗口。
6. 快捷键可唤起 Quick。
7. Quick 打开后输入框聚焦。
8. Quick 搜索正常。
9. Quick 创建任务正常。
10. Quick 创建并打开正常。
11. Quick 连续创建正常。
12. Quick 失焦关闭正常。
13. Quick Esc 关闭/清空逻辑正常。
14. 创建后主窗口列表刷新。
15. 退出后无 helper 进程残留。

### 12.3 验证命令

```bash
bun run typecheck
bun run test:run
bun run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --workspace
cargo clippy --manifest-path src-tauri/Cargo.toml --workspace --all-targets --all-features -- -D warnings
```

如果仓库当前存在无关既有失败，必须记录精确失败测试名和错误，不得混入本次重构范围。

---

## 13. 风险与取舍

最大收益：

1. 删除跨进程 IPC 和 helper supervisor。
2. 删除 helper 打包、签名、版本一致性和残留进程问题。
3. Rust workspace 从旧双进程心智模型彻底切换到单 Binary。
4. 业务可脱离 Tauri 测试。
5. SeaORM entity 不再被误用成业务模型。
6. 平台窗口复杂度不污染业务层。

最大风险：

1. 迁移范围大，短期 import 和 package name 修改多。
2. macOS NSPanel 从 helper 迁回主 app 后，ActivationPolicy / Dock / Cmd+Tab 体验可能变化。
3. 架构层级更清楚，但执行时必须守边界，否则会变成形式主义。
4. 一次性删除旧 crate 会造成中间态编译失败，需要严格分阶段推进。

接受的取舍：

```txt
牺牲旧 helper 的进程级隔离
换取更低维护成本、更短调用链、更简单打包和更清楚的单 Binary 模型
```

不接受：

```txt
功能缩水
Quick Create 体验回退
用 mock 或占位替代真实业务链路
长期保留新旧双轨
```

---

## 14. 最终推荐

执行本重构时，应把边界卡死：

1. 只做单 Binary 架构迁移。
2. 不顺手重做 Quick Create UI。
3. 不改业务模型语义，除非迁移边界必须拆分类型。
4. 不新增 Sticky / AI / Command Center 等新能力。
5. 不长期保留 helper 兼容层。
6. 不继续沿用 `desktop-app / core` 作为目标 crate 名。

最终交付状态：

```txt
StoneFlow = 一个 Tauri app
main window = 主工作台
quick window = 全局快捷创建入口
runtime = Tauri 外壳
platform = 桌面窗口平台能力
domain = 业务规则
usecase = 用例编排
storage = SQLite / SeaORM 实现
schema = SeaORM entity
migration = schema 演进
testing = 测试基础设施
```
