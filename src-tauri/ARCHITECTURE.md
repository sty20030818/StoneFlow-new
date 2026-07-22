# StoneFlow Tauri 后端架构

> 版本：v8
> 作用：定义 `src-tauri/` 当前已经落地的 Rust + Tauri v2 正式边界
> 适用范围：`/Users/stonefish/Desktop/StoneFlow/src-tauri`
> 最后更新：2026-07-22

---

## 1. 当前真实心智

StoneFlow 当前是一个单 binary 的 Tauri 桌面应用：

1. 只有一个生产 binary：`stoneflow`
2. 主窗口和 Launcher 浮窗由同一个 Tauri Core 管理
3. 业务规则在 `domain` / `application`
4. 持久化在 `storage`（含 entities 与 migration）
5. 同步在同进程 `sync` library
6. Tauri 壳层、IPC、窗口、shortcut、tray 在 `runtime` / `platform`

前端与后端的真实关系是：

```txt
Frontend (React)
  -> feature api facade
  -> Tauri invoke / event
  -> runtime
  -> application / storage / sync / platform
  -> SQLite / Turso
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

根包 `stoneflow` 本身只负责桌面入口与 Tauri 绑定。

已移除：`usecase`（改名 application）、`schema` / `migration`（并入 storage）、`sync-worker` sidecar（改为 sync library）、`integration-tests` host（并入 runtime `#[cfg(test)]`）。

`runtime/services` 仍是过渡 adapter，标记为 R9 清理目标。

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
6. usecase / storage adapter 装配；
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
3. 窗口规格和回调注入点。

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

### 3.4 `usecase`

`usecase` 是业务编排层。

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

### 3.6 `schema` 与 `migration`

`schema` 只放 SeaORM entity / relation / 表结构映射。

`migration` 只放版本化 schema 变更。

二者都不应该承载产品业务语义。

### 3.7 `test-support` 与 `integration-tests`

`test-support` 是共享测试基础设施。

`integration-tests` 是全链路集成测试 host。

不要再把这两者混成一个“泛 testing crate”。

---

## 4. 依赖方向

当前允许的方向：

```txt
root package
  -> runtime

runtime
  -> platform, usecase, storage, domain, schema

platform
  -> tauri, os-specific bindings

usecase
  -> domain

storage
  -> domain, usecase, schema, migration, sea-orm

migration
  -> schema, sea-orm-migration

schema
  -> sea-orm

test-support
  -> domain, usecase, storage, migration

integration-tests
  -> runtime-facing integration chain + test-support
```

明确禁止：

1. `domain` 依赖 `usecase` / `storage` / `runtime` / `tauri`
2. `usecase` 依赖 `storage` 具体实现
3. `storage` 依赖 `runtime`
4. `schema` 反向依赖业务层
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
├─ app/
│  ├─ error.rs
│  └─ state.rs
├─ services/
├─ commands/
│  ├─ activity.rs
│  ├─ lifecycle.rs
│  ├─ projects.rs
│  ├─ search.rs
│  ├─ settings.rs
│  ├─ spaces.rs
│  ├─ tasks.rs
│  ├─ views.rs
│  ├─ workspace.rs
│  └─ launcher/
│     ├─ domain.rs
│     ├─ window.rs
│     ├─ error.rs
│     └─ mod.rs
└─ window/
   ├─ main.rs
   └─ launcher/
      ├─ runtime.rs
      ├─ session.rs
      ├─ controller.rs
      ├─ frontend.rs
      ├─ callbacks.rs
      └─ mod.rs
```

这里几个关键点已经确定：

1. `composition.rs` 是 composition root 命名，不再使用旧的 `assembly`
2. `window/launcher/*` 是 Launcher 窗口主线，不再放回主窗口目录
3. `commands/launcher` 按 `domain` 和 `window` 分开
4. 主窗几何由 `window-state`（仅 `main`，flags 不含 `VISIBLE`）+ `window/main.rs` 冷启动编排；Launcher 不参与

---

## 6. Launcher 后端边界

Launcher 当前不是一个“前端小弹窗”，而是一条跨 Tauri / runtime / platform / frontend 的完整链路。

### 6.1 窗口链路

```txt
Option+Space
-> runtime::shortcuts
-> runtime::window::launcher::runtime / session
-> platform::launcher_window
-> emit launcher:session-prepared
-> frontend present_session
-> launcher_present_session
-> emit launcher:session-presented
```

### 6.2 业务链路

```txt
frontend features/launcher/api
-> invoke("launcher_*")
-> runtime::commands::launcher::domain
-> services::LauncherService
-> usecase::launcher
-> storage repositories
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
-> runtime::services::*
-> usecase
-> storage repository
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

1. 主窗口拿完整业务权限
2. Launcher 只拿最小必要窗口与事件权限
3. 不把 `windows: ["*"]` 当正式长期方案

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
2. `usecase`：编排与 mock port 单测
3. `storage`：repository / bootstrap 测试
4. `integration-tests`：真实全链路集成
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
2. 在 `schema` 上表达产品默认值决策
3. `domain` / `usecase` 依赖 Tauri
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
   放 `usecase`
3. 是数据库实现、repository、mapper 吗？
   放 `storage`
4. 是 entity / relation 吗？
   放 `schema`
5. 是 schema 版本变更吗？
   放 `migration`
6. 是 Tauri command、窗口、state、shortcut、event、service adapter 吗？
   放 `runtime`
7. 是 OS-specific 窗口能力吗？
   放 `platform`

如果改的是 crate 边界，同步更新这份文档。
