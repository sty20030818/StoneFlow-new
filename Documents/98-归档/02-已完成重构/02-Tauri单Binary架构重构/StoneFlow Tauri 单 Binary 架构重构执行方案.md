# StoneFlow Tauri 单 Binary 架构重构执行方案

> 版本：v2.0  
> 状态：开发任务拆分  
> 最后更新：2026-06-14  
> 适用范围：执行 `StoneFlow Tauri 单 Binary 架构重构方案.md`  
> 架构真源：`src-tauri/ARCHITECTURE.md`  
> 原则：一次性破坏性重构，最终不保留 helper 生产路径；每阶段必须可验证，不用 POC 或 mock 替代真实功能。

---

## 0. 执行总原则

本执行方案面向真实落地，不是讨论稿。

目标：

```txt
从双 Tauri binary + 旧 workspace
迁移到单 Tauri binary + 方案 A workspace
并保持所有既有 Quick Create / 主窗口 / 托盘 / 快捷键功能完好
```

执行规则：

1. 允许破坏性重构。
2. 不保留长期双轨。
3. 不引入新产品能力。
4. 不重做 UI 视觉。
5. 不用 mock 代替真实服务。
6. 每阶段完成后运行对应验证。
7. 删除旧代码必须发生在新路径接管后。
8. 目标 crate 是 `runtime / platform / domain / usecase / storage / schema / migration / testing`。
9. 当前 `desktop-app / core / helper-app / ipc-protocol` 只是迁移来源，不是目标约束。

---

## 1. 阶段总览

| 阶段 | 名称 | 目标 |
|------|------|------|
| S0 | 基线审计与冻结 | 确认当前功能入口、测试基线、旧 crate 引用和删除范围 |
| S1 | 新 workspace 骨架 | 建立方案 A crate、Cargo 依赖方向和空模块边界 |
| S2 | schema / migration 迁移 | 将 SeaORM entity 和 migration 收口到 `schema` / `migration` |
| S3 | domain / usecase 迁移 | 将业务模型、用例、ports 从旧 crate 迁入新边界 |
| S4 | storage 迁移 | 将 SQLite / SeaORM repositories / bootstrap 迁入 `storage` |
| S5 | runtime / platform 迁移 | 将 Tauri commands、windows、tray、shortcut、platform window 接入新 runtime |
| S6 | 前端 facade 切换 | Quick Create 前端改调新 command，保持 UI/交互语义 |
| S7 | 删除旧 helper 与旧 crate | 删除 helper、Local IPC、旧 workspace 边界和打包脚本 |
| S8 | 权限、配置与打包收口 | capabilities、tauri.conf、Cargo workspace、依赖清理 |
| S9 | 全量验收与回归修复 | 自动测试、手动验收、修复架构迁移引入的问题 |

---

## S0：基线审计与冻结

### 目标

在动代码前确认：

1. 当前 Quick Create 真实入口。
2. 当前 helper / ipc / supervisor 相关所有引用。
3. 当前 Rust crate 之间的真实依赖。
4. 当前测试基线。
5. 当前工作区已有用户改动。

### 任务

1. 记录 git 状态。

```bash
git status --short
```

2. 搜索旧边界引用。

```bash
rg "desktop-app|stoneflow-core|helper-app|helper-bin|ipc-protocol|interprocess|stoneflow-helper" src-tauri
```

3. 搜索 helper / Quick command。

```bash
rg "helper_quick_|quick-create:|notifyFrontendReady|commitLayout|presentSession|closeSession" src src-tauri
```

4. 导出 cargo metadata。

```bash
cargo metadata --manifest-path src-tauri/Cargo.toml --format-version 1
```

5. 运行基线验证。

```bash
bun run typecheck
bun run test:run
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --workspace
```

### 交付物

1. 当前失败测试清单。
2. 旧 crate 引用清单。
3. Quick Create 入口清单。
4. 计划删除/迁移文件清单。

### 验收

必须明确：

```txt
哪些失败是重构前已有
哪些路径必须迁移
哪些文件会被删除
哪些旧类型会迁到哪个新 crate
```

### S0 基线记录（2026-06-14）

#### 1. 工作区已有改动

`git status --short` 当前只有两处既有改动：

```txt
M  bun.lock
M  package.json
```

S0 不修改这两处文件，也不把它们混入本次架构重构判断。

#### 2. 当前 Rust workspace 真实成员

`cargo metadata --manifest-path src-tauri/Cargo.toml --format-version 1 --no-deps` 显示当前仍是旧拓扑：

```txt
stoneflow-core
desktop-app
stoneflow-entity
stoneflow-ipc-protocol
stoneflow-migration
stoneflow-test-support
stoneflow-helper-app
stoneflow-helper
stoneflow
```

当前根依赖方向也仍然是：

```txt
stoneflow -> desktop-app
desktop-app -> core / entity / migration / ipc-protocol / interprocess
helper-app -> ipc-protocol / interprocess
helper-bin -> helper-app
migration -> entity
```

结论：S1 之前，生产路径和构建路径都还没有脱离旧双进程心智模型。

#### 3. Quick Create 当前真实入口

前端 facade 仍完全依赖 `helper_quick_*`：

```txt
src/features/quick-create/api/quickCreate.ts
  helper_quick_get_initial_state
  helper_quick_commit_layout
  helper_quick_report_layout_diagnostics
  helper_quick_present_session
  helper_quick_close_session
  helper_quick_frontend_ready
  helper_quick_frontend_unready
  helper_quick_list_projects_by_space
  helper_quick_search
  helper_quick_create
  helper_quick_create_and_open
  helper_quick_open_target
```

helper 侧命令注册仍位于：

```txt
src-tauri/crates/helper-app/src/lib.rs
src-tauri/crates/helper-app/src/commands/domain.rs
src-tauri/crates/helper-app/src/commands/window.rs
src-tauri/crates/helper-app/src/commands/diagnostics.rs
```

Quick Create 事件链当前仍包含：

```txt
quick-create:session-prepared
quick-create:session-presented
quick-create:session-close-requested
quick-create:session-invalidated
```

结论：S6 之前，前端 Quick Create 不能脱离 helper 命令命名和 helper runtime 生命周期。

#### 4. helper / IPC / supervisor 现状

高信号入口如下：

```txt
src-tauri/crates/desktop-app/src/app/helper_runtime.rs
src-tauri/crates/desktop-app/src/app/supervisor/*
src-tauri/crates/helper-app/src/ipc_client.rs
src-tauri/crates/ipc-protocol/src/lib.rs
src-tauri/helper-bin/src/main.rs
```

当前 `src-tauri/Cargo.toml` 仍保留：

```txt
workspace members:
  crates/core
  crates/desktop-app
  crates/entity
  crates/helper-app
  crates/ipc-protocol
  crates/migration
  crates/test-support
  helper-bin

workspace dependencies:
  interprocess
  stoneflow-ipc-protocol
```

结论：helper binary、Local IPC、supervisor actor、helper capabilities 仍都在真实生产路径上。

#### 5. 当前自动化基线

S0 实测结果：

```txt
bun run typecheck                              PASS
bun run test:run                              PASS (111 files, 604 tests)
cargo check --manifest-path src-tauri/Cargo.toml   PASS
cargo test --manifest-path src-tauri/Cargo.toml --workspace   FAIL
```

唯一既有失败：

```txt
package: desktop-app
test: tests::database_bootstrap_tests::database_bootstrap_should_create_sqlite_and_report_ready
assert: left = 2, right = 1
extra signal: failed to remove temporary database dir ... (os error 32)
```

S0 结论：

1. 前端基线是绿的。
2. Rust 编译基线是绿的。
3. Rust workspace 测试基线只有一个既有失败，后续所有阶段都必须继续单独记录它，不能把迁移引入的问题混进去。

#### 6. 明确的删除 / 迁移清单

S7 最终删除对象：

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

S1-S5 期间的主要迁移目标：

```txt
desktop-app/src/app/commands            -> runtime/src/commands
desktop-app/src/app/{windows,helper_runtime,exit_coordinator}
                                       -> runtime/src/windows + runtime state
desktop-app/src/app/supervisor/*       -> 删除；必要退出策略迁入 runtime
desktop-app/src/application/*          -> usecase/src
desktop-app/src/domain/*               -> domain/src
desktop-app/src/infrastructure/*       -> storage/src
entity/src/*                           -> schema/src
migration                              -> 保留目录，改依赖 schema
helper-app/src/panel*                  -> platform/src
helper-app/src/commands/*              -> runtime command adapter / runtime window runtime
ipc-protocol/src/lib.rs                -> 删除；业务类型迁入 usecase，IPC DTO 迁入 runtime
test-support                           -> testing
```

这份清单从 S1 开始视为执行真源。

---

## S1：新 workspace 骨架

### 目标

建立方案 A crate 拓扑，并让 workspace 能在最小空壳状态下编译。

### 新增 crate

```txt
src-tauri/crates/runtime
src-tauri/crates/platform
src-tauri/crates/domain
src-tauri/crates/usecase
src-tauri/crates/storage
src-tauri/crates/schema
src-tauri/crates/testing
```

保留：

```txt
src-tauri/crates/migration
```

但后续要调整其依赖为 `schema`。

### 任务

1. 新增各 crate 的 `Cargo.toml` 和 `src/lib.rs`。
2. 在每个 crate 顶部写 `//!` crate 职责说明。
3. 在 root `Cargo.toml` 添加新 members。
4. 暂时保留旧 members，避免一步删除导致迁移无法编译。
5. 建立目标依赖方向：

```txt
runtime -> usecase / storage / platform
platform -> tauri
usecase -> domain
storage -> usecase / domain / schema / migration
migration -> schema
schema -> sea-orm
testing -> domain / usecase / storage / migration
```

6. 添加 workspace lint 或至少记录后续 clippy 命令。

### 验收

```bash
cargo check --manifest-path src-tauri/Cargo.toml
```

架构验收：

1. 新 crate 都能被 cargo metadata 识别。
2. 新 crate 之间没有反向依赖。
3. 旧 crate 仍存在，但不再作为目标结构写新代码。

---

## S2：schema / migration 迁移

### 目标

将 SeaORM entity 从旧 `entity` 迁到 `schema`，并让 `migration` 依赖新 `schema`。

### 主要迁移

```txt
crates/entity/src/* -> crates/schema/src/*
crates/migration -> 保留目录名，但依赖改为 schema
```

### 任务

1. 移动 SeaORM entity、relation、common field 定义到 `schema`。
2. 将 package name 改为 `stoneflow-schema`。
3. 修改 migration 中对旧 entity crate 的引用。
4. 确认 `schema` 不依赖 domain/usecase/runtime。
5. 保留旧 `entity` 作为短期 re-export 只在迁移阶段可接受；最终必须删除。

### 验收

```bash
cargo check --manifest-path src-tauri/Cargo.toml -p stoneflow-schema
cargo check --manifest-path src-tauri/Cargo.toml -p stoneflow-migration
```

架构验收：

1. `schema` 只包含 SeaORM entity。
2. `schema` 不包含业务默认值、usecase DTO、command DTO。
3. `migration` 不依赖 runtime。

---

## S3：domain / usecase 迁移

### 目标

将业务模型、业务规则、application service、repository trait 迁出旧 `desktop-app/core`，形成纯业务层和用例层。

### 主要迁移

```txt
旧 domain/value objects -> crates/domain
旧 application/services -> crates/usecase
旧 repository trait -> crates/usecase/ports
```

### 任务

1. 在 `domain` 中建立：

```txt
task/
project/
space/
view/
activity/
quick_create/
ids.rs
time.rs
error.rs
```

2. 将不依赖 I/O 的业务规则迁入 `domain`。
3. 在 `usecase` 中建立：

```txt
tasks/
projects/
spaces/
views/
quick_create/
ports/
dto/
error.rs
```

4. 将 Quick Create 业务流程迁入 `usecase`：

```txt
get_initial_state
list_projects_by_space
search
create
create_and_open 的业务决策部分
open target resolve
```

5. repository trait 放在 `usecase::ports`。
6. 不把 Tauri `AppHandle`、event emitter、window label 带入 `domain` / `usecase`。
7. command DTO 不进入 `domain`；必要输入输出定义为 usecase DTO。

### 验收

```bash
cargo check --manifest-path src-tauri/Cargo.toml -p stoneflow-domain
cargo check --manifest-path src-tauri/Cargo.toml -p stoneflow-usecase
cargo test --manifest-path src-tauri/Cargo.toml -p stoneflow-domain
cargo test --manifest-path src-tauri/Cargo.toml -p stoneflow-usecase
```

架构验收：

1. `domain` 不依赖 Tauri / SeaORM。
2. `usecase` 不依赖 Tauri / storage implementation。
3. Quick Create 核心业务可不启动 Tauri 测试。

---

## S4：storage 迁移

### 目标

将 SQLite、SeaORM repository implementation、database bootstrap、transaction 实现迁入 `storage`。

### 主要迁移

```txt
旧 infrastructure/database -> crates/storage/database
旧 repository implementation -> crates/storage/repositories
旧 mapper/helper -> crates/storage/mappers
```

### 任务

1. 建立 `storage::database`：

```txt
connection.rs
bootstrap.rs
transaction.rs
```

2. 建立 `storage::repositories` 实现 `usecase::ports`。
3. 建立 `storage::mappers`，负责 `schema::Model` 与 domain/usecase DTO 转换。
4. 将 migration runner 接入 storage bootstrap。
5. 确认 SeaORM `Model` / `ActiveModel` 不泄漏到 usecase 公共 API。
6. 将当前 database bootstrap 测试迁到 storage 或 testing。

### 验收

```bash
cargo check --manifest-path src-tauri/Cargo.toml -p stoneflow-storage
cargo test --manifest-path src-tauri/Cargo.toml -p stoneflow-storage
```

架构验收：

1. `storage` 不依赖 runtime。
2. `storage` 实现 usecase ports。
3. 业务测试可以 mock ports，不必真实 SQLite。

---

## S5：runtime / platform 迁移

### 目标

建立单 Binary Tauri runtime，并将 Quick window 平台行为迁入 `platform`。

### 新 runtime 文件

```txt
crates/runtime/src/
├─ commands/
├─ windows/
├─ bootstrap.rs
├─ events.rs
├─ shortcuts.rs
├─ tray.rs
├─ state.rs
├─ error.rs
└─ lib.rs
```

### 新 platform 文件

```txt
crates/platform/src/
├─ quick_window.rs
├─ macos.rs
├─ windows.rs
├─ error.rs
└─ lib.rs
```

### 任务

1. 将 Tauri Builder / plugin registration / setup 迁入 `runtime`。
2. 将 main window 创建迁入 `runtime::windows::main`。
3. 将 Quick window runtime 迁入 `runtime::windows::quick_runtime`。
4. 将 tray / global shortcut / single-instance 迁入 `runtime`。
5. 将 macOS NSPanel / Windows floating window 迁入 `platform`。
6. `runtime` 调 `platform` 做窗口 prepare/present/hide/apply_height。
7. `runtime` 调 `usecase` 做 Quick Create 数据和业务。
8. `runtime` 管 pending open intent 和 event。
9. root `src/lib.rs` 改为调用 `stoneflow_runtime::run()`。

### 验收

```bash
cargo check --manifest-path src-tauri/Cargo.toml -p stoneflow-platform
cargo check --manifest-path src-tauri/Cargo.toml -p stoneflow-runtime
cargo check --manifest-path src-tauri/Cargo.toml
```

手动验收：

1. 主窗口能创建。
2. 主窗口 close 仍是 hide。
3. tray 能 show/hide/quit。
4. Quick window 可隐藏创建。
5. 快捷键 handler 不再经过 helper。

---

## S6：前端 facade 切换

### 目标

前端 Quick Create 保持 UI 和 domain 结构，底层从 `helper_quick_*` command 切换到 `quick_create_*` command。

### 主要文件

```txt
src/features/quick-create/api/quickCreate.ts
src/features/quick-create/runtime/quickCreateSessionBridge.ts
src/features/quick-create/runtime/QuickCreateSessionProvider.tsx
src/features/quick-create/layout/useQuickCreateLayout.ts
src/features/quick-create/domain/useQuickCreateCommands.ts
```

### 任务

1. 修改 command name：

```txt
helper_quick_get_initial_state -> quick_create_get_initial_state
helper_quick_commit_layout -> quick_create_commit_layout
helper_quick_report_layout_diagnostics -> quick_create_report_layout_diagnostics
helper_quick_present_session -> quick_create_present_session
helper_quick_close_session -> quick_create_close_session
helper_quick_frontend_ready -> quick_create_frontend_ready
helper_quick_frontend_unready -> quick_create_frontend_unready
helper_quick_list_projects_by_space -> quick_create_list_projects_by_space
helper_quick_search -> quick_create_search
helper_quick_create -> quick_create_create
helper_quick_create_and_open -> quick_create_create_and_open
helper_quick_open_target -> quick_create_open_target
```

2. 保持 TypeScript 类型不大改，除非 Rust DTO 字段确实变化。
3. 删除前端对 helper 语义的不可见命名。
4. 保留事件名 `quick-create:*`，避免扩大前端改动。
5. 确认 route 仍加载 Quick Create 页面。

### 验收

```bash
bun run typecheck
bun run test:run
```

功能验收：

1. Quick 前端 ready 能上报。
2. session prepared 能收到。
3. layout commit 后窗口展示。
4. 搜索和创建调用新 command。

---

## S7：删除旧 helper 与旧 crate

### 目标

当新路径已经接管 Quick Create 后，删除旧 helper 生产代码和旧 workspace 边界。

### 删除目录

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

注意：`crates/migration` 保留，但已按新依赖接入 `schema`。

### 任务

1. 从 workspace members 删除旧 crate。
2. 删除 workspace dependencies：

```txt
interprocess
stoneflow-ipc-protocol
```

3. 删除 helper bundle script 和 `beforeBundleCommand`。
4. 删除 supervisor state / command / restart policy。
5. 删除 Local IPC server/client。
6. 全仓搜索确认无旧引用：

```bash
rg "desktop-app|stoneflow-core|helper-app|helper-bin|stoneflow-helper|stoneflow-ipc-protocol|interprocess|helper_quick_|spawn_supervisor|start_ipc_server"
```

### 验收

```bash
cargo check --manifest-path src-tauri/Cargo.toml
bun run typecheck
```

架构验收：

1. `cargo metadata` 不含旧 crate。
2. `rg "helper_quick_"` 无生产代码命中。
3. `rg "interprocess"` 无生产代码命中。
4. `runtime / platform / domain / usecase / storage / schema / migration / testing` 是唯一 workspace 后端边界。

---

## S8：权限、配置与打包收口

### 目标

让单 Binary 架构在 Tauri v2 capability、插件、打包配置上闭环。

### 主要文件

```txt
src-tauri/tauri.conf.json
src-tauri/capabilities/*.json
src-tauri/Cargo.toml
src-tauri/crates/*/Cargo.toml
package.json
bun.lock
```

### 任务

1. `tauri.conf.json` 删除 helper bundle 命令。
2. 确认主 app 包只生成 `StoneFlow`。
3. 新增或调整 capabilities：

```txt
main-capability
quick-capability
```

4. Main capability 允许主窗口所需插件。
5. Quick capability 只允许 Quick 所需 core/event/window 权限。
6. global shortcut 由 Rust 注册，不给 Quick JS 直接注册权限。
7. opener/dialog/store 不无差别给 Quick。
8. 确认 `@tauri-apps/api` 调用仍使用 v2 `@tauri-apps/api/core`。
9. 通过 cargo metadata 检查依赖方向。

### 验收

```bash
bun run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo metadata --manifest-path src-tauri/Cargo.toml --format-version 1
```

手动验收：

1. dev 模式启动没有 helper 编译日志。
2. bundle 前不再执行 helper bundle 脚本。
3. Quick command 不因 capability 失败。

---

## S9：全量验收与回归修复

### 自动验证

必须运行：

```bash
bun run typecheck
bun run test:run
bun run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo test --manifest-path src-tauri/Cargo.toml --workspace
cargo clippy --manifest-path src-tauri/Cargo.toml --workspace --all-targets --all-features -- -D warnings
```

如果 clippy 或 test 因仓库既有问题失败，记录精确失败，不扩大修复范围。

### 手动验收清单

#### 主窗口

1. 启动 app，主窗口显示。
2. 关闭按钮隐藏主窗口，不退出进程。
3. 托盘点击显示/隐藏主窗口。
4. 托盘 Quit 完整退出。
5. 第二次启动聚焦主窗口。

#### Quick Create

1. 全局快捷键唤起 Quick。
2. 打开后输入框聚焦。
3. 空输入显示 recent tasks/projects。
4. 输入后搜索 task/project。
5. Enter 创建并关闭。
6. Shift+Enter 创建并继续。
7. Cmd/Ctrl+Enter 创建并打开主窗口详情。
8. Esc 行为符合现有 Quick Create 语义。
9. 失焦隐藏。
10. 连续打开/关闭不出现卡死或重复 session。

#### 数据与事件

1. 创建任务写入 SQLite。
2. 主窗口 task list 刷新。
3. `stoneflow://tasks/changed` 生效。
4. `stoneflow://command/open` 或 pending open intent 生效。
5. 主窗口未 ready 时打开 intent 不丢。

#### 进程

1. 任务管理器中不再出现 `stoneflow-helper`。
2. 退出后无残留 StoneFlow 子进程。
3. dev 日志无 helper build / helper supervisor / Local IPC server 噪音。

### 回归修复原则

1. 只修本次迁移导致的问题。
2. 不顺手改 UI 视觉。
3. 不顺手改业务字段模型。
4. 不把既有无关测试失败混入本次 scope。

---

## 10. 推荐提交拆分

如果需要分 commit，建议：

1. `refactor(tauri): scaffold single-binary runtime workspace`
2. `refactor(tauri): move database schema and migrations`
3. `refactor(domain): split domain and usecase layers`
4. `refactor(storage): move SeaORM repositories behind usecase ports`
5. `refactor(runtime): migrate Tauri commands and windows`
6. `refactor(platform): move quick window platform adapters`
7. `refactor(quick-create): route frontend through runtime commands`
8. `refactor(tauri)!: remove helper binary and local ipc`
9. `chore(tauri): tighten capabilities and bundle config`

如果最终一次提交，应使用 breaking change framing：

```txt
refactor(tauri)!: migrate to single-binary runtime architecture

BREAKING CHANGE: replace the old desktop-app/core/helper workspace with runtime/platform/domain/usecase/storage/schema/migration/testing and remove the helper binary, local IPC protocol, and helper supervisor.
```

---

## 11. 完成定义

本重构只有在以下条件全部满足时才算完成：

1. Quick Create 所有用户功能可用。
2. 主窗口 / 托盘 / single-instance 行为可用。
3. helper 相关生产代码删除。
4. Local IPC 相关依赖删除。
5. 旧 `desktop-app / core / helper-app / ipc-protocol / entity / test-support` 边界删除或完成迁移。
6. 新 workspace 使用 `runtime / platform / domain / usecase / storage / schema / migration / testing`。
7. domain/usecase 不依赖 Tauri。
8. schema 不承载领域规则。
9. capabilities 按 main / quick 拆分。
10. 自动验证结果明确。
11. 手动验收结果明确。
12. 文档中的旧双进程方案不再作为后续实现依据。

---

## 12. 不做事项

本次重构不做：

1. 不重做 Quick Create 视觉。
2. 不新增 Sticky window。
3. 不新增 headless autostart。
4. 不新增 updater。
5. 不新增 AI / Command Center。
6. 不改 task/project 数据模型语义。
7. 不做跨设备同步。
8. 不把 Quick Create 改成通用 launcher。

这些能力未来可以独立规划，但不能混进这次架构迁移。
