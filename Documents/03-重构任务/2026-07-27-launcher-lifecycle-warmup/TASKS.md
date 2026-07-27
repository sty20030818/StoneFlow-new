# Launcher 生命周期与后台预热重构任务

## 目标

让 Launcher 在不拖慢主应用首帧的前提下，于第一次全局快捷键触发时即可稳定、快速地获得可输入的界面。

本任务采用破坏性重构：Launcher 不再复用主应用的完整 React 入口、Router 和 Shell Provider；不保留旧路由、轮询或双生命周期兼容层。

## 已确认需求

- 主应用启动必须优先保证主窗口首帧和可交互性。
- Launcher 是独立原生窗口，不是主窗口中的浮层。
- Launcher 应在主应用可交互后后台预热，用户第一次按快捷键不应承担 WebView 冷启动。
- 每次打开必须以当前 Space、项目和最近数据为准，不能依赖难以失效的前端预取缓存。
- 允许破坏性重构；目标是长期单一架构，不保留旧入口或兼容代码。

## 改造前基线

### 主应用启动

改造前主链路是：

```text
src-tauri/src/main.rs
  -> app_lib::run()
  -> stoneflow_runtime::run()
  -> Builder::setup(bootstrap::setup_app)
  -> 数据库 bootstrap
  -> build_main_window
  -> 注册全局快捷键 / Tray
  -> detached: sync 初始化、startup sync、更新检查
```

同步和更新检查已经是后台任务，不等待其完成后再展示主窗口。Launcher 不在 `setup_app()` 创建，因此主窗口启动不会等待 Launcher。

改造前 Launcher 复用的前端入口是：

```text
src/main.tsx
  -> App
  -> QueryClientProvider
  -> AppProviders
  -> RouterProvider
  -> /launcher route
```

### 改造前 Launcher 首次唤起

```text
global shortcut
  -> shortcuts::handle_toggle()
  -> ensure_launcher_panel()
  -> 原生隐藏窗口 / NSPanel 创建
  -> 加载 index.html#/launcher
  -> 完整 React App 挂载并注册三类 session 事件监听
  -> frontend ready IPC
  -> Rust 以 20ms 间隔轮询 ready，最长 1 秒
  -> prepare_launcher_session()
  -> 准备隐藏窗口 + 查询 Launcher 初始态
  -> emit launcher:session-prepared
  -> 前端请求 present
  -> 原生窗口成为 key 后，输入框获得焦点
```

首次慢并非单一异步遗漏，而是三类冷成本被压进快捷键关键路径：

1. 原生 Launcher 窗口和 WebView 创建。
2. 与主应用相同的 React 入口、Provider 和 Router 启动。
3. Launcher 初始态查询。目前 `get_initial_state()` 先后读取 Space、候选 Space、默认 Space 项目、最近任务和最近项目；最近实体又对每一行查询关联 Space / Project，存在 N+1 查询。

后续唤起会复用隐藏 WebView，但每次仍在打开路径读取初始态。这一部分应保持最新，不应该改成长期前端缓存。

## 推荐架构

```text
主窗口完成首帧
  -> app_lifecycle_main_surface_ready
  -> detached launcher warmup
       -> 创建隐藏原生窗
       -> 加载 launcher.html 的独立前端入口
       -> 注册 session 监听并报告 ready
       -> LauncherWarmupRuntime = Ready

全局快捷键
  -> LauncherWarmupRuntime.ensure_ready()
  -> 获取本次最新 open context
  -> 原生 present
  -> 输入框可用
  -> 后台刷新最近任务 / 项目
```

### 1. 独立前端入口

新增 `launcher.html` 与 `src/launcher.tsx`，作为 Vite 多页面构建的独立入口。它只渲染 Launcher 所需的：

- `LauncherSessionProvider`
- `LauncherDomainProvider`
- `PresentSession`
- `LauncherPanel`

它不得挂载 `App`、`QueryClientProvider`、`AppProviders`、TanStack Router 或 Shell。原生窗口 URL 改为 `launcher.html`，删除 `src/routes/launcher.tsx` 与主路由树中的 Launcher 路由。

理由：Launcher 有独立窗口、独立 session 和独立交互状态。通过 Hash 路由进入主应用只是复用入口，不是合理的依赖关系；它会让快速捕获窗启动无关的导航、Shell 和 Provider。

### 2. 单一预热生命周期

在 runtime 中新增 Launcher 专属的预热协调器，归属 `runtime/window/launcher`。它只表达窗口前端是否可供 session 使用：

```text
Cold -> Warming -> Ready
                 -> Failed
```

`LauncherWindowRuntimeState` 继续只管理一次会话的：

```text
Idle -> Preparing -> Presenting -> Visible -> Closing -> Idle
```

两者不得合并。预热是进程生命周期，session 是用户的一次打开操作；合并会让关闭窗口错误地影响已加载的前端状态。

预热协调器要求：

- `warmup()` 是幂等且单飞的；并发调用只加入同一次预热。
- `ensure_ready()` 等待真实的 readiness 通知，不使用固定次数 sleep 轮询。
- 前端 listener 全部完成注册后调用一次 `launcher_frontend_ready`；Rust 通过 `Notify`、`watch` 或同等原语唤醒等待者。
- 主应用只在主窗真正可交互后触发 `warmup()`，且不 await。
- 若用户在预热未完成时按快捷键，快捷键加入同一任务并等待其完成；不得重复创建面板。
- 预热失败必须可重试，并记录结构化日志；不得把运行时永久卡在 `Warming`。

主窗首帧信号应是一个通用 application-lifecycle IPC，由 `main` 窗口发送。Rust 需校验来源 window label 为 `main`；Launcher 独立入口不触发该信号。这样主应用与 Launcher 的依赖只停在“主窗已可交互”这个稳定事件，主 Shell 不依赖 Launcher 模块实现。

### 3. 打开路径的数据拆分

打开时仍从 Rust 读取最新数据，但将数据分成两类：

| 类别 | 时机 | 原因 |
| --- | --- | --- |
| Open context：当前 scope、默认 Space、Space / 项目选项、默认归属 | `prepare session` | 创建任务必须正确归属，属于输入可用的前提。 |
| Recent data：最近任务、最近项目 | 窗口可见后后台加载 | 只影响推荐结果，不应延迟输入框。 |

前端 reducer 显式表达 `contextReady` 与 `recentLoading`，而不是以空数组暗示未加载。用户可立刻输入；最近列表到达后以 transition 更新，不抢占输入响应。

不引入跨窗口数据缓存、订阅同步或 stale-time 配置。数据量有限，而“打开时查询 + 高效 SQL”比维护缓存失效规则更简单、更可靠。

### 4. 初始态查询收口

`LauncherContextService` 只负责编排，不出现数据库细节。Storage adapter 提供面向 Launcher 的批量读取：

- recent tasks 使用 Space 与 Project 的 join / 预取一次完成，消除逐条 `find_by_id`。
- recent projects 使用 Space join / 预取一次完成。
- 相互独立的 Space、候选 Space、recent tasks、recent projects 用 `try_join!` 并发；依赖默认 Space 的项目读取在默认 Space 确定后执行。

该优化属于数据访问边界，不能在前端用缓存或并发 invoke 规避 N+1。

## 模块边界

| 模块 | 职责 | 禁止承担 |
| --- | --- | --- |
| `runtime/app` | 主窗可交互生命周期信号 | Launcher 窗口创建和 session 状态。 |
| `runtime/window/launcher` | 原生窗口预热、前端 ready、session 状态机、平台 controller 编排 | SQL、React 状态或主 Shell 路由。 |
| `platform/*/panel` | macOS NSPanel / Windows WebviewWindow 的创建、显示、隐藏、焦点回调 | 业务数据、轮询、IPC 编排。 |
| `application/launcher_context` | Open context 与 recent data 的用例编排 | SeaORM 查询实现、窗口控制。 |
| `storage/adapters/launcher` | Launcher 批量查询和 DTO 映射 | session、快捷键和 UI 状态。 |
| `src/launcher.tsx` | Launcher 独立 React composition root | 主应用 Router、Shell Provider、主窗启动信号。 |
| `features/launcher` | 表单、搜索、session bridge 与 UI | 直接管理原生窗口或数据库。 |

## 实施阶段

### Phase 0：基线与契约

- [x] 为当前链路增加开发日志 / tracing span：`launcher.warmup_started`、`launcher.frontend_ready`、`launcher.session_prepared`、`launcher.presented`。
- [ ] 记录首次与二次快捷键的阶段耗时，区分 WebView 冷启动、initial context 与 present。
- [x] 写出当前 Launcher session 状态机的 Rust 单元测试基线，覆盖重复快捷键、失焦关闭和 session mismatch。

完成条件：有可比较的阶段耗时，不以主观体感作为唯一回归判断。

### Phase 1：独立 Launcher 前端入口

- [x] 配置 Vite 多页面构建，新增 `launcher.html` 和 `src/launcher.tsx`。
- [x] 将 Launcher 入口组件从 `LauncherPage` 收口为独立 composition root。
- [x] 原生 `LAUNCHER_URL` 改为独立页面 URL。
- [x] 删除 `/launcher` 文件路由、route tree 条目和主应用启动路径中的 Launcher 依赖。
- [x] 验证独立入口不引入 Shell、Router 或主应用 Provider。

完成条件：Launcher 窗口能独立加载、监听 session 事件、显示和关闭；主窗口导航行为不变。

### Phase 2：预热生命周期

- [x] 新增主窗 `surface ready` 生命周期信号，校验 IPC 来源为 `main` 窗口。
- [x] 新增 Launcher warmup 协调器与纯状态转换测试。
- [x] 将窗口创建从 `shortcuts::handle_toggle()` 移入后台 warmup。
- [x] 删除 ready 轮询与超时循环，改用单飞 readiness 通知。
- [x] 快捷键只执行 `ensure_ready()` 与 session toggle；预热中重复触发不重复初始化。
- [x] 平台层保留 macOS 主线程约束和 Windows 焦点自动隐藏语义（代码路径未改，待实机复核）。

完成条件：主窗首帧不等待 Launcher；预热完成后的首次快捷键不再创建窗口或等待前端 listener。

### Phase 3：打开数据与交互优先级

- [x] 将 `LauncherInitialState` 拆为 Open context 与 Recent data DTO / command。
- [x] session-prepared 只携带输入所需 Open context。
- [x] session-prepared 后异步加载 recent data；输入焦点不等待此请求。
- [x] reducer 和 UI 显式处理 recent loading / error，保留已有搜索和创建语义。
- [x] 删除旧的整包 snapshot 刷新路径及由它产生的重复状态字段。

完成条件：网络 / 数据库较慢时用户仍能立即聚焦并输入；创建任务的默认 Space 和归属始终来自本次打开。

### Phase 4：查询性能收口

- [x] 重写 recent task / project adapter 查询，消除 N+1 关联读取。
- [x] 将独立读取改为用例层并发，保留依赖默认 Space 的顺序。
- [x] 为 DTO 映射、空项目归属、无默认 Space 与查询错误补测试。
- [ ] 使用 release 构建或真实打包应用复测 Phase 0 指标（已验证 `launcher.html` 被嵌入 macOS app bundle；真实耗时采样仍待桌面运行）。

完成条件：初始上下文查询数量与 recent 条数无关；Rust 侧没有为性能引入前端缓存或隐式全局状态。

### Phase 5：删除旧路径与交付

- [x] 删除 `/launcher` 主路由、旧入口、轮询 ready、旧 session snapshot API 和仅为它们保留的类型。
- [x] 更新 `src-tauri/ARCHITECTURE.md`、`src/features/launcher/ARCHITECTURE.md` 与相关窗口契约文档。
- [ ] 完成 Windows 与 macOS 的手动行为验证。
- [x] 全量执行质量门禁。

完成条件：仓库中只有一个 Launcher 前端入口、一个预热生命周期和一个 session 状态机。

## 不做的事

- 不在 `setup_app()` 同步创建并等待 Launcher；这会牺牲主窗冷启动。
- 不用固定延时猜测“主窗应该已渲染”。以主窗实际 surface-ready 信号为准。
- 不为近期数据做跨会话缓存或事件失效体系。
- 不新增插件、账号系统或后台常驻服务。
- 不保留 `/launcher` 路由或 polling ready 作为兼容回退。

## 验收标准

### 本轮验证记录（2026-07-27）

- 已在 macOS 开发实例实际触发 `Option+Space`：预热 ready 475ms、open context 2ms、present 48ms。
- 修复 `wait_until_ready()` 将 `MutexGuard` 带过 await 的死锁；该问题会阻塞 frontend ready / timeout 状态推进，表现为快捷键无响应。
- 新增并发回归测试，保证等待前端时仍可进入失败状态并允许下一轮预热。
- 若前端启动超时且原生窗仍存在，下一轮预热会重载该 WebView 后重新等待 ready，避免失败状态只能靠重启应用恢复。
- 仍需在发布包和 Windows 完成下列 release gate；开发实例成功不替代跨平台发布验证。

### 自动验证

- [x] `bun run build`
- [x] `bun run typecheck`
- [x] `bun run lint`
- [x] `bun run lint:boundaries`
- [x] `bun run format:check`
- [x] `bun run test:run`
- [x] `cargo fmt --manifest-path src-tauri/Cargo.toml --check`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml --workspace`
- [x] `cargo clippy --manifest-path src-tauri/Cargo.toml --workspace --all-targets --locked -- -D warnings`

### 行为验证

以下为真实桌面交互的 release gate，不能由当前 macOS 编译与单元测试替代。当前机器只有 `aarch64-apple-darwin` target，且正式 StoneFlow 正在运行，因此未注入全局快捷键以避免干扰用户会话。

- [ ] 冷启动主应用：Launcher 预热不会阻塞主窗口首帧或输入。
- [ ] 预热完成后第一次快捷键：窗口立即展示并聚焦输入框。
- [ ] 预热尚未完成时第一次快捷键：只等待同一预热任务，不创建重复窗口。
- [ ] 连续快捷键：可见时关闭、隐藏时打开，session 不串台。
- [ ] 失焦、Esc、提交后关闭仍符合现有平台语义。
- [ ] 切换 Space 后打开 Launcher：默认 Space / 项目归属正确。
- [ ] recent 查询慢或失败：输入、创建、打开已有目标不受阻塞。
- [ ] macOS NSPanel 与 Windows WebviewWindow 都保持当前定位、焦点和自动隐藏行为。

## 风险与取舍

| 风险 | 处理 |
| --- | --- |
| 后台预热与主窗首次渲染争抢 CPU | 只在主窗 surface-ready 后触发；不在 `setup` 中 await。 |
| 用户在预热完成前立刻按快捷键 | 单飞 readiness 让请求加入同一次任务，不走重复初始化或固定超时。 |
| recent 数据延迟导致内容晚到 | 最近列表降级为后台增强；输入和创建路径不依赖它。 |
| 独立入口遗漏样式或共享依赖 | 将共享样式保留在入口层，使用独立入口 smoke test 与打包产物检查。 |
| 多窗口 IPC 误触发主窗生命周期 | Rust 校验调用来源 label，只接受 `main`。 |

## 开始条件

本方案已获方向确认。实施前仅需先完成 Phase 0 的基线记录；不要在没有阶段耗时的情况下把任意改善都归因于预热。
