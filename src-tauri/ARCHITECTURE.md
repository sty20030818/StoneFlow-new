# StoneFlow Tauri 后端架构

> 版本：v9.2
> 作用：定义 `src-tauri/` 当前已经落地的 Rust + Tauri v2 正式边界
> 适用范围：`/Users/stonefish/Desktop/StoneFlow/src-tauri`
> 最后更新：2026-08-24

---

## 1. 当前真实心智

StoneFlow 当前是一个单 binary 的 Tauri 桌面应用：

1. 只有一个生产 binary：`stoneflow`
2. 主窗口和 Launcher 浮窗由同一个 Tauri Core 管理
3. 业务规则在 `domain` / `application`
4. 持久化在 `storage`（含 entities 与单一 baseline migration）
5. 同步在同进程 `sync` library
6. Tauri 壳层、IPC、窗口、shortcut、tray 在 `runtime` / `platform`

前端与后端的真实关系是：

```txt
Frontend (React)
  -> feature api facade
  -> Tauri invoke / event
  -> runtime
  -> application / storage / sync / platform
  -> SQLite / Postgres（云端副本）
```

前端不会直接访问数据库，也不会绕过 `runtime` 直连 `application`。

---

## 2. Workspace 布局

当前 `src-tauri/` 既是 Tauri app 包，也是 Rust workspace root。

```txt
src-tauri/
├─ src/
│  ├─ main.rs
│  └─ lib.rs
├─ crates/
│  ├─ runtime/
│  ├─ platform/
│  ├─ domain/
│  ├─ application/
│  ├─ storage/
│  ├─ sync/
│  ├─ release-verifier/
│  └─ test-support/
├─ capabilities/
│  ├─ main.json
│  └─ launcher.json
├─ tauri.conf.json
└─ Cargo.toml
```

当前 workspace members：

1. `crates/runtime`
2. `crates/platform`
3. `crates/domain`
4. `crates/application`
5. `crates/storage`
6. `crates/sync`
7. `crates/test-support`
8. `crates/release-verifier`

根包 `stoneflow` 本身只负责桌面入口与 Tauri 绑定。

已移除：独立 schema / migration workspace crate、`sync-worker` sidecar、`runtime/services` 过渡层。仓库中若仍有旧空目录，不代表正式 crate；workspace 以 `Cargo.toml` 的 members 为准。

`runtime` 仅作 composition / transport；业务用例经 `AppState` 调用 `application`，ports 由 `storage::adapters` 实现。本地 schema 为**单一 baseline 迁移**，不支持旧库在线升级。

**Task 归属：** write `TaskWritePlacementKind` = `project` \| `standalone`；list `TaskPlacementQuery` = `All` \| `Project` \| `Standalone`。无 Inbox / `inbox_at`。独立事项 = `project_id IS NULL`。Launcher 初始态直出 application DTO（与 tasks 薄 transport 一致）。

---

## 3. 分层与职责

### 3.1 `runtime`

`runtime` 是 Tauri 壳层和 composition root。

它负责：

1. `tauri::Builder` 组装；
2. 插件注册；
3. commands 注册；
4. 主窗口、Launcher、tray、global shortcut、single-instance；
5. Tauri `State`；
6. AppState 装配（application services + sync）；
7. event 发射与 pending command open 协调。

它不负责：

1. 纯领域规则；
2. 数据表结构定义；
3. OS-specific 浮窗底层行为细节；
4. 直接把 SeaORM model 暴露给前端。

### 3.2 `platform`

`platform` 只负责平台相关窗口行为，当前核心是 `launcher_window`。

它负责：

1. Launcher 浮窗 prepare / present / hide / resize；
2. macOS / Windows 差异封装；
3. 窗口规格和回调注入点；
4. 系统凭证（Keychain / Credential Manager）适配。

它不负责：

1. 业务规则；
2. 数据访问；
3. Tauri command 语义；
4. Launcher 的业务初始化。

### 3.3 `domain`

`domain` 只放纯领域规则和值对象。

它负责：

1. 领域枚举；
2. ID / 时间 / 生命周期规则；
3. 纯业务校验；
4. 领域错误。

它不负责：

1. Tauri
2. SeaORM
3. SQLite
4. 任何 I/O

### 3.4 `application`

`application` 是业务编排层。

它负责：

1. 用例流程；
2. DTO；
3. ports / trait；
4. 跨 repository 的业务语义；
5. Launcher、Task、Project、Space、View、Lifecycle 等业务编排。

它不负责：

1. Tauri command 入口；
2. 具体数据库实现；
3. 平台窗口行为。

### 3.5 `storage`

`storage` 是持久化实现层。

它负责：

1. 数据库初始化；
2. repository 实现；
3. mapper；
4. 通过 SeaORM 访问 SQLite；
5. 启动时执行 migration。

它不负责：

1. 领域规则；
2. Tauri state；
3. 前端 DTO 序列化。

### 3.6 `storage::entities` 与 `storage::migration`

`storage::entities` 只放 SeaORM entity / relation / 表结构映射。

`storage::migration` 只维护当前数据库的单一 baseline migration；不承担旧库在线升级。

二者都不应该承载产品业务语义。

### 3.7 `test-support` 与集成测试

`test-support` 是共享测试基础设施。

后端集成测试当前位于 `runtime/src/integration_tests`，只在测试构建中启用；不存在独立 `integration-tests` workspace crate。

不要再把这两者混成一个“泛 testing crate”。

---

## 4. 依赖方向

当前允许的方向：

```txt
root package
  -> runtime

runtime
  -> platform, application, storage, sync, domain

platform
  -> tauri, os-specific bindings

application
  -> domain

storage
  -> application, domain, sea-orm, sea-orm-migration

sync
  -> sqlx

test-support
  -> storage

release-verifier
  -> minisign-verify
```

明确禁止：

1. `domain` 依赖 `application` / `storage` / `runtime` / `tauri`
2. `application` 依赖 `storage` 具体实现
3. `storage` 依赖 `runtime`
4. `storage::entities` 反向依赖业务层
5. 生产代码依赖 `test-support`

---

## 5. `runtime` 当前结构

当前 `runtime` 目录的主线是：

```txt
crates/runtime/src/
├─ lib.rs
├─ bootstrap.rs
├─ tray.rs
├─ shortcuts.rs
├─ exit_coordinator.rs
├─ command_open.rs
├─ composition.rs
├─ release_endpoint.rs
├─ update_schedule.rs
├─ app/
│  ├─ error.rs
│  └─ state.rs
├─ update/
│  ├─ adapter.rs
│  ├─ events.rs
│  ├─ service.rs
│  └─ settings_store.rs
├─ commands/
│  ├─ activity.rs
│  ├─ app_lifecycle.rs
│  ├─ changelog.rs
│  ├─ lifecycle.rs
│  ├─ projects.rs
│  ├─ search.rs
│  ├─ settings.rs
│  ├─ spaces.rs
│  ├─ sync.rs
│  ├─ tasks.rs
│  ├─ update.rs
│  ├─ views.rs
│  ├─ workspace.rs
│  └─ launcher/
│     ├─ domain.rs
│     ├─ window.rs
│     ├─ error.rs
│     └─ mod.rs
├─ sync/
├─ integration_tests/
└─ window/
   ├─ main.rs
   └─ launcher/
      ├─ runtime.rs
      ├─ session.rs
      ├─ controller.rs
      ├─ warmup.rs
      ├─ callbacks.rs
      └─ mod.rs
```

这里几个关键点已经确定：

1. `composition.rs` 是 composition root 命名，不再使用旧的 `assembly`
2. `window/launcher/*` 是 Launcher 窗口主线，不再放回主窗口目录
3. `commands/launcher` 按 `domain` 和 `window` 分开
4. Windows 使用 `window-state` 持久化主窗口位置和尺寸（不保存最大化状态）；macOS / Linux 每次冷启动使用默认尺寸并居中；Launcher 不参与

### 5.1 更新、Changelog 与 Release endpoint

- `application::update` 保有更新会话唯一权威快照；`runtime::update` 只负责 Tauri updater adapter、设置持久化、事件和装配。opaque updater handle 始终留在 Rust 进程内。
- `release_endpoint.rs` 只解析共享的发布根地址：update adapter 由此构造当前渠道的 per-platform pointer，`commands/changelog.rs` 由此读取根 `CHANGELOG.md`。
- 更新命令边界为 `check_update`、`download_update`、`install_staged_update`、`get_update_session`、`cancel_update_download` 以及设置与完成标记命令；Changelog 只暴露 `get_changelog`。
- 更新生命周期只发送 `update-session-changed` 快照事件；不再存在平行 phase/progress 事件或 renderer 端自行拼装的会话真源。

---

## 6. Launcher 后端边界

Launcher 当前不是一个“前端小弹窗”，而是一条跨 Tauri / runtime / platform / frontend 的完整链路。

### 6.1 窗口链路

```txt
全局快捷键（macOS: Option+Space；Windows: Alt+Space；其它: Control+Shift+Space）
-> runtime::shortcuts
-> runtime::window::launcher::warmup::ensure_launcher_ready
-> runtime::window::launcher::session
-> platform::launcher_window
-> emit launcher:session-prepared
-> frontend present_session
-> launcher_present_session
-> emit launcher:session-presented
```

预热不属于快捷键关键路径：主窗口在首次可交互渲染后调用 `app_main_surface_ready`，runtime 校验来源为 `main`，再后台启动 `LauncherWarmupState`。该状态机只管理 `Cold -> Warming -> Ready | Failed`，通过 `Notify` 单飞等待前端 `launcher_frontend_ready`；每次用户打开的 session 状态仍由 `LauncherWindowRuntimeState` 独立管理。

### 6.2 业务链路

```txt
frontend features/launcher/api
-> invoke("launcher_*")
-> runtime::commands::launcher::domain
-> AppState.launcher / AppState.launcher_context
-> application::launcher / application::launcher_context
-> storage adapters / repositories
```

### 6.3 当前事件事实

当前前端真正监听的是：

1. `launcher:session-prepared`
2. `launcher:session-presented`
3. `launcher:session-invalidated`

这说明 Launcher 的稳态已经是“runtime session + frontend layout orchestration”，不是旧 helper lifecycle 说法。

---

## 7. 典型请求链路

### 7.1 普通 CRUD

```txt
frontend feature api
-> invoke("create_task" / "update_project" / ...)
-> runtime::commands::*
-> AppState 中的 application service
-> application port
-> storage adapter / repository
-> SQLite
```

### 7.2 Command Open

```txt
backend emit stoneflow://command/open
-> frontend shared/events/commandOpen
-> ShellLayout resolve target path / detail strategy
```

### 7.3 Workspace Sync

```txt
backend emit stoneflow://tasks/changed
-> frontend shared/events/taskChanged
-> features/workspace/useWorkspaceSync
-> invalidateWorkspaceQueries
```

---

## 8. Tauri v2 约定

### 8.1 入口

```rust
// src/main.rs
fn main() {
    app_lib::run();
}

// src/lib.rs
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    stoneflow_runtime::run(tauri::generate_context!());
}
```

### 8.2 Capabilities

当前 capability 按窗口拆分：

1. `capabilities/main.json`
2. `capabilities/launcher.json`

长期规则：

1. 主窗口只拿当前业务 UI 需要的权限；更新通过自有 Tauri commands 与 core event 完成，renderer 不授予 `updater:*` 或 `store:*` 原生权限
2. `tauri-plugin-updater` 只是 runtime adapter 的后端实现细节，不是前端 API
3. Launcher 只拿最小必要窗口与事件权限
4. 不把 `windows: ["*"]` 当正式长期方案

### 8.3 Global Shortcut

系统级快捷键在 Rust 侧注册，落点是 `shortcuts.rs`。

不要把系统级快捷键职责下放到 Launcher 前端。

---

## 9. 错误处理

当前错误分层：

1. `DomainError`
2. `ApplicationError`
3. `StorageError`
4. `AppError`

规则：

1. command 对外返回可序列化 `AppError`
2. 底层错误在 adapter 边界映射
3. 生产路径避免 `unwrap()` / `expect()`
4. `thiserror` 作为正式错误建模工具，`anyhow` 仅用于启动 glue 或测试辅助

---

## 10. 测试边界

当前测试分布：

1. `domain`：纯规则单测
2. `application`：编排与 mock port 单测
3. `storage`：repository / bootstrap 测试
4. `runtime/src/integration_tests`：后端全链路集成
5. 前端：`src/**/*.test.ts(x)` 验证 IPC facade、交互与回归

推荐验证命令：

```bash
cargo check --manifest-path src-tauri/Cargo.toml --workspace
cargo test --manifest-path src-tauri/Cargo.toml --workspace
```

如需格式化：

```bash
cargo fmt --manifest-path src-tauri/Cargo.toml
```

---

## 11. 架构不变式

以下情况应直接视为后端架构回退：

1. 在 Tauri command 内直接写业务规则
2. 在 `storage::entities` 上表达产品默认值决策
3. `domain` / `application` 依赖 Tauri
4. 生产代码依赖 `test-support`
5. 把 Launcher 再揉回“一个文件处理全部窗口行为”
6. 让前端绕过 feature api，按命令名散落调用后端
7. 未同步文档就擅自改 crate 边界或依赖方向

---

## 12. 新代码落点

新增后端代码时按这个顺序判断：

1. 是纯业务规则吗？
   放 `domain`
2. 是业务编排或 port 吗？
   放 `application`
3. 是数据库实现、repository、mapper 吗？
   放 `storage`
4. 是 entity / relation 吗？
   放 `storage::entities`
5. 是 schema 版本变更吗？
   当前不新增增量迁移；修改 `storage::migration` 的 baseline，并同步评估数据重建边界
6. 是 Tauri command、窗口、state、shortcut、event、service adapter 吗？
   放 `runtime`
7. 是 OS-specific 窗口能力吗？
   放 `platform`

如果改的是 crate 边界，同步更新这份文档。
