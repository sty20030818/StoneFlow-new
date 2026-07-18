# StoneFlow Helper 生命周期长期方案

> 版本：v1
> 状态：长期架构方案
> 最后更新：2026-05-23
> 适用范围：`desktop-app`、`helper-app`、`helper-bin`、Quick Create 全局弹窗、helper supervisor、主应用退出链路

---

## 0. 一句话结论

StoneFlow 应继续采用 **主 App 作为 Core Owner，helper 作为 Accessory Shell** 的双进程架构。

当前方向是对的，但生命周期编排还不够干净。长期最佳方案不是把 helper 并回主 App，也不是继续调大 `taskkill` 超时，而是把现有 supervisor 升级为一套明确的：

```txt
Core-owner
+ Helper-accessory
+ 显式 handshake
+ 协议化 graceful shutdown
+ 可观测生命周期状态机
```

主 App 负责数据库、业务服务、IPC server、helper 进程所有权和退出决策。helper 只负责全局快捷键、Quick Create 独立窗口和请求转发。

---

## 1. 背景与问题

### 1.1 触发背景

当前 Windows 退出日志出现：

```txt
准备关闭 helper 进程, pid=38152, reason=supervisor 停止
helper 未在 2s 内退出，回退到强制结束, pid=38152
helper 进程已强制关闭, pid=38152, status=exit code: 1
helper supervisor 已停止
Failed to unregister class Chrome_WidgetWin_0. Error = 1412
error: script "dev" exited with code 255
```

这说明主 App 已经能触发真实退出，helper 也会被 supervisor 回收，但 helper 没有在当前 2 秒窗口内完成正常退出，于是走了强制关闭路径。

### 1.2 当前现象的判断

这些日志不应直接等同于业务失败：

1. `exit code: 1` 很可能来自 helper 被强制关闭，而不是 helper 业务主动失败。
2. `Chrome_WidgetWin_0` 更像 WebView2 / Tauri 窗口资源在强杀路径下没有正常析构。
3. `script "dev" exited with code 255` 可能是 `tauri dev` 外层 runner 的清理语义，需要单独验证，不应混入应用生命周期状态。

但这些日志说明当前生命周期语义不够好：

1. helper 退出不是由 helper 内部按顺序清理完成。
2. supervisor 只能从外部终止进程，不能证明 helper 已清理窗口、快捷键和日志。
3. 状态和日志无法区分“正常退出但返回码非零”“被终止”“崩溃”“dev runner 退出”。

---

## 2. 当前实现事实

本节只描述当前代码事实，不代表长期推荐方案。

### 2.1 主应用启动链路

当前主应用入口在：

```txt
src-tauri/src/main.rs
src-tauri/crates/desktop-app/src/app/mod.rs
```

当前启动顺序大致是：

```txt
tauri dev
  -> beforeDevCommand: bun dev
  -> desktop-app builder setup
    -> 注册 Tauri 插件
    -> 创建 ActiveScopeState / CommandHelperState
    -> bootstrap_database
    -> build_main_window
    -> helper_runtime::start_ipc_server
    -> HelperSupervisor::new
    -> spawn(supervisor.run())
    -> setup_tray
```

这个顺序基本可用。主 App 会先准备数据库和 IPC，再由 supervisor 拉起 helper。

### 2.2 helper 启动链路

当前 helper 入口在：

```txt
src-tauri/helper-bin/src/main.rs
src-tauri/crates/helper-app/src/lib.rs
```

当前 helper setup 大致是：

```txt
stoneflow-helper
  -> helper-app builder setup
    -> debug 下注册 log plugin
    -> macOS 设置 Accessory activation policy
    -> macOS 创建 NSPanel / Windows 创建 Tauri 浮窗
    -> manage QuickPopupRuntimeState
    -> 注册全局快捷键
    -> 异步 ping 主 App IPC
```

helper 的职责方向正确：它不拥有数据库，业务动作通过 IPC 回到主 App。

### 2.3 supervisor 当前状态机

当前 supervisor 状态：

```txt
Idle
Starting
WaitingHandshake
Ready
Restarting
CircuitOpen
Stopped
```

当前握手规则是：

```txt
helper 的第一个 IPC 请求到达
= supervisor 认为 handshake 成功
```

这能工作，但长期不够明确。第一个请求可能是 `Ping`，也可能是业务请求；它不能表达 helper 版本、能力、平台信息和窗口 ready 状态。

### 2.4 当前退出链路

当前托盘退出路径大致是：

```txt
tray quit
  -> ExitControl.allow_exit = true
  -> SupervisorHandle.request_shutdown()
  -> SupervisorHandle.wait_stopped()
  -> app_handle.exit(0)
```

supervisor 停止 helper 的路径：

```txt
transition_to(Stopped)
  -> mark_shutting_down
  -> set_shutdown_requested(true)
  -> shutdown_helper_process("supervisor 停止")
    -> Windows: taskkill /PID <pid>
    -> 等待 2s
    -> 超时后 child.kill()
```

当前主要问题是：Windows `taskkill /PID` 是外部终止请求，不是 helper 内部的 graceful shutdown 协议。

---

## 3. 长期目标

### 3.1 架构目标

目标架构：

```txt
desktop-app
  owns:
    - 数据库
    - 业务服务
    - IPC server
    - helper supervisor
    - app lifecycle / exit intent
    - tray quit 真实退出决策

helper-app
  owns:
    - 全局快捷键
    - Quick Create 独立窗口
    - Quick Create popup session runtime
    - helper 内部清理顺序

ipc-protocol
  owns:
    - main/helper 控制协议
    - Quick Create 业务请求协议
```

### 3.2 运行目标

1. helper 不接数据库。
2. helper 不拥有业务规则。
3. helper 不直接决定任务创建、打开、搜索结果。
4. main 是 helper 生命周期唯一 owner。
5. 所有真实退出入口统一经过一个退出协调器。
6. helper 能通过协议正常退出，只有无响应时才被 OS 终止。
7. 日志能区分 expected shutdown、crash、kill、dev runner cleanup。
8. 状态能明确表达 helper 是“进程 ready”还是“窗口 ready”。

### 3.3 非目标

本方案不做：

1. 不把 helper 并回主 App。
2. 不把 helper 升级成独立常驻 daemon。
3. 不把业务状态同步到 helper。
4. 不引入复杂插件化生命周期系统。
5. 不要求一次性重写 Quick Create 前端。
6. 不把所有 Tauri 事件都抽象成通用 event bus。

---

## 4. 推荐启动生命周期

### 4.1 目标启动顺序

推荐主 App 启动顺序：

```txt
App process start
  -> 初始化日志
  -> 初始化 AppLifecycleState / ExitCoordinator / CommandHelperState
  -> 初始化数据库和 migration
  -> 启动 helper IPC server
  -> 创建主窗口
  -> 启动 helper supervisor actor
  -> supervisor resolve/build helper binary
  -> supervisor spawn helper process
  -> helper 发送 HelperHello
  -> main 校验协议版本和能力
  -> main 标记 helper process ready
  -> helper Quick Create frontend 注册监听
  -> helper 标记 window ready
  -> main/helper 状态进入 Running
```

### 4.2 为什么 IPC server 要早于 helper

helper 启动后会立即依赖主 App：

1. 启动自检需要 ping 主 App。
2. Quick Create 打开时要向主 App 获取初始上下文。
3. 搜索和创建都要回到主 App。

因此 IPC server 必须早于 helper。否则 helper 会出现“进程已启动但核心服务未连接”的不稳定状态。

### 4.3 为什么数据库要早于 helper

helper 不拥有数据库，但它的业务请求最终都会进入主 App 数据库服务。如果数据库初始化失败，helper 即使启动也没有意义。

长期规则：

```txt
数据库 ready 之前，不启动 helper。
```

这样失败路径更清楚：数据库失败是主 App 初始化失败，不会被误判成 helper 失败。

### 4.4 主窗口与 helper 的顺序

主窗口可以在 IPC server 后创建，也可以在 helper spawn 前创建。推荐：

```txt
数据库 -> IPC server -> 主窗口 -> helper
```

理由：

1. 主窗口尽早出现，用户能看到应用正在启动或已 ready。
2. helper 是主 App 能力的附属入口，应在主服务 ready 后启动。
3. helper 不应成为主窗口可见的前置条件。

### 4.5 helper 不建议懒启动

不推荐等用户第一次按快捷键时再启动 helper。

原因：

1. Quick Create 是高频入口，应在 App 启动后尽快可用。
2. 首次快捷键才启动 helper 会让第一次捕获变慢。
3. 懒启动会把启动失败延迟到用户操作时，排查体验更差。

更好的策略是：

```txt
主服务 ready 后立即启动 helper。
```

---

## 5. 推荐退出生命周期

### 5.1 退出入口统一

所有真实退出入口都应进入同一个协调器：

```txt
ExitCoordinator.request_exit(reason)
```

常见 reason：

```txt
TrayQuit
SystemShutdown
UpdaterRestart
DevRunnerStop
FatalInitializationError
PanicBoundary
```

普通窗口关闭不是退出，应继续保持 hide 语义：

```txt
WindowCloseRequested -> prevent_close -> hide
```

托盘“退出 StoneFlow”才是真退出：

```txt
TrayQuit -> request_exit(TrayQuit)
```

### 5.2 目标退出顺序

推荐退出顺序：

```txt
request_exit(reason)
  -> 设置 ExitIntent::Quit
  -> 禁止新窗口/session 打开
  -> 通知主窗口 frontend 做轻量 flush
  -> 请求 helper graceful shutdown
    -> helper 禁用新快捷键事件
    -> helper 关闭 active Quick Create session
    -> helper 隐藏/销毁 Quick Create 窗口
    -> helper 注销全局快捷键
    -> helper flush 日志
    -> helper app.exit(0)
  -> supervisor 等 helper 退出
  -> 停止 IPC server
  -> 销毁 tray
  -> main app.exit(0)
```

### 5.3 三段式 helper 关闭策略

长期应采用三段式关闭：

```txt
第 1 层：应用协议 graceful shutdown
第 2 层：OS terminate signal
第 3 层：force kill
```

Windows 当前从第 2 层开始，缺少第 1 层。

推荐策略：

```txt
1. 先发 HelperShutdown 控制消息。
2. 等 helper 主动 exit 0。
3. 超时后再用 OS terminate。
4. 仍超时才 force kill。
```

### 5.4 推荐超时

建议超时：

```txt
release:
  graceful shutdown: 5s
  terminate fallback: 2s
  force kill: immediate

debug/dev:
  graceful shutdown: 8s
  terminate fallback: 3s
  force kill: immediate
```

debug/dev 更长是因为 WebView2、日志转发、dev server 和调试 runtime 都会放大退出耗时。

### 5.5 helper 内部关闭顺序

helper 收到 `HelperShutdown` 后应按以下顺序：

```txt
mark_shutting_down
  -> unregister global shortcut 或屏蔽 shortcut handler
  -> if active session:
       emit session invalidated / close requested
       hide window
       reset runtime to idle
  -> close/destroy Quick Create window
  -> flush logs
  -> app.exit(0)
```

关键点：

1. 先屏蔽快捷键，避免 shutdown 中又打开新 session。
2. 再关闭 session，保证前端状态不悬挂。
3. 再销毁窗口，让 WebView2/Tauri 有正常析构机会。
4. 最后退出进程。

---

## 6. 生命周期状态模型

### 6.1 helper supervisor 状态

推荐替换为更细的状态：

```txt
NotStarted
ResolvingBinary
BuildingDevBinary
Spawning
ProcessStarted
WaitingHello
ProcessReady
WindowBooting
WindowReady
Running
Stopping
Stopped
Crashed
CircuitOpen
```

### 6.2 状态含义

| 状态 | 含义 |
|------|------|
| `NotStarted` | supervisor 尚未启动 helper |
| `ResolvingBinary` | 正在解析 helper 二进制路径 |
| `BuildingDevBinary` | debug 下正在编译 helper |
| `Spawning` | 正在创建 helper 进程 |
| `ProcessStarted` | helper 进程已 spawn，但还没握手 |
| `WaitingHello` | 等待 helper 显式 Hello |
| `ProcessReady` | helper 协议和 IPC 已确认 |
| `WindowBooting` | helper 窗口/前端正在初始化 |
| `WindowReady` | Quick Create 前端监听已注册 |
| `Running` | 快捷键可以正常打开 Quick Create |
| `Stopping` | 正在执行关闭流程 |
| `Stopped` | helper 已停止 |
| `Crashed` | helper 非预期退出 |
| `CircuitOpen` | 重启次数过多，熔断 |

### 6.3 为什么要区分 ProcessReady 和 WindowReady

当前排障经常会混淆三类问题：

1. helper 进程没起来。
2. IPC 没连上。
3. Quick Create 前端没 ready。

这三类问题的修复路径完全不同。状态模型必须把它们分开，否则日志只能说“helper 不可用”，无法指导下一步。

### 6.4 对外快照

建议主 App 暴露诊断快照：

```ts
type HelperLifecycleSnapshot = {
  processStatus: HelperProcessStatus
  ipcStatus: HelperIpcStatus
  windowStatus: HelperWindowStatus
  helperPid: number | null
  helperBinaryPath: string | null
  protocolVersion: number | null
  helperVersion: string | null
  capabilities: string[]
  lastHelloAt: string | null
  lastReadyAt: string | null
  lastExitAt: string | null
  lastExitKind: 'graceful' | 'terminated' | 'killed' | 'crashed' | null
  lastExitCode: number | null
  lastShutdownReason: string | null
  lastError: string | null
  restartCount: number
}
```

---

## 7. IPC 协议设计

### 7.1 协议分层

建议将 helper-main IPC 分成两类：

```txt
Control Protocol
Business Protocol
```

控制协议负责生命周期：

```txt
HelperHello
HelperShutdown
HelperHealth
HelperWindowReady
HelperWindowUnready
```

业务协议负责 Quick Create：

```txt
QuickGetInitialState
QuickListProjectsBySpace
QuickSearch
QuickCreate
QuickCreateAndOpen
QuickOpenTarget
```

### 7.2 HelperHello

推荐握手请求：

```rust
HelperHello {
    protocol_version: u16,
    helper_version: String,
    platform: String,
    pid: u32,
    capabilities: Vec<String>,
}
```

主 App 响应：

```rust
HelperHelloAck {
    accepted: bool,
    protocol_version: u16,
    min_supported_protocol_version: u16,
    main_version: String,
    reason: Option<String>,
}
```

长期规则：

```txt
没有 HelperHello，就不能进入 ProcessReady。
```

### 7.3 HelperShutdown

推荐关闭请求：

```rust
HelperShutdown {
    reason: HelperShutdownReason,
    deadline_ms: u64,
}
```

helper 响应：

```rust
HelperShutdownAck {
    accepted: bool,
    phase: String,
}
```

helper 收到后主动退出。主 App 不应把 ack 当成完成，仍然要等待进程退出。

### 7.4 HelperWindowReady

Quick Create 前端注册事件监听后，helper 应能把窗口 ready 状态上报给 main。

```rust
HelperWindowReady {
    window_label: String,
    ready_at: String,
}
```

这样主 App 诊断面板可以明确显示：

```txt
helper process ready
ipc ready
quick create frontend ready
```

### 7.5 协议版本策略

建议：

1. `ipc-protocol` 维护 `PROTOCOL_VERSION`。
2. `HelperHello` 必须携带版本。
3. main 拒绝不兼容版本。
4. debug 下日志提示“请重新编译 helper”。
5. release 下视为安装包不一致，应进入 `CircuitOpen` 或展示错误。

---

## 8. Supervisor 设计

### 8.1 推荐边界

当前 supervisor 已经承担 helper owner 角色，方向正确。长期建议重组为：

```txt
src-tauri/crates/desktop-app/src/app/supervisor/
  mod.rs
  actor.rs
  command.rs
  state.rs
  binary_resolver.rs
  shutdown.rs
  log_forwarder.rs
  restart_policy.rs
```

### 8.2 actor 模型

推荐 supervisor 内部使用 command channel：

```rust
enum SupervisorCommand {
    Start,
    Stop { reason: ShutdownReason },
    Restart { reason: RestartReason },
    HelperHello(HelperHello),
    HelperWindowReady,
    HelperWindowUnready,
    GetSnapshot { reply: oneshot::Sender<HelperLifecycleSnapshot> },
}
```

好处：

1. 只有 actor 持有 `current_child`。
2. 关闭、重启、状态读取都走同一条队列。
3. 不需要在 UI/tray 回调里同步 sleep 等待。
4. 更容易加入 cancellation token。

### 8.3 不建议同步 wait_stopped

当前 `wait_stopped()` 是同步轮询：

```txt
while !stopped {
  sleep(20ms)
}
```

它能避开借用问题，但长期不是最佳模型。更好的方式是：

```txt
托盘事件 -> spawn async task -> await exit coordinator -> app.exit(0)
```

这样不会阻塞事件回调线程，也更符合 async 生命周期。

### 8.4 CancellationToken

建议用 cancellation token 管理：

1. health check loop。
2. helper stdout/stderr log forwarding。
3. IPC server accept loop。
4. shutdown deadline。

长期目标是：

```txt
退出时所有后台 task 都可取消、可等待、可记录结果。
```

### 8.5 重启策略

推荐重启策略：

1. helper unexpected exit 才重启。
2. expected shutdown 不重启。
3. handshake 超时可以重启。
4. 协议不兼容不应无限重启，应进入 `CircuitOpen`。
5. 快速崩溃多次进入熔断。

必须记录：

```txt
exit_kind
exit_code
exit_reason
restart_count
last_crash_at
```

---

## 9. ExitCoordinator 设计

### 9.1 为什么需要 ExitCoordinator

当前退出逻辑分散在：

1. tray menu event。
2. `RunEvent::ExitRequested`。
3. `RunEvent::Exit`。
4. supervisor shutdown。

长期应该由一个协调器统一决定：

```txt
这个关闭请求是 hide，还是 quit，还是 restart。
```

### 9.2 推荐职责

`ExitCoordinator` 负责：

1. 接收真实退出请求。
2. 设置退出意图。
3. 防止重复退出。
4. 请求 frontend flush。
5. 请求 supervisor stop。
6. 停 IPC server。
7. 调用 `app.exit(0)`。

不负责：

1. helper 具体怎么清理窗口。
2. 数据库业务写入规则。
3. Quick Create session 内部状态。

### 9.3 退出幂等

退出请求必须幂等：

```txt
第一次 request_exit: 进入 ShuttingDown
第二次 request_exit: 返回已有 shutdown future / 当前状态
```

原因：

1. 用户可能重复点托盘退出。
2. 系统关机事件可能和用户退出接近同时发生。
3. `RunEvent::Exit` 可能和 tray quit 链路重叠。

---

## 10. helper-app 内部设计

### 10.1 helper 角色

helper 是 accessory shell，不是业务后端。

允许承担：

1. 全局快捷键注册。
2. Quick Create 窗口创建、显示、隐藏、销毁。
3. Quick Create session runtime。
4. 将业务请求转发给 main。
5. 生命周期控制请求响应。

禁止承担：

1. 数据库连接。
2. 任务创建规则。
3. 搜索规则。
4. 项目归属规则。
5. 主窗口导航规则。
6. 长期业务状态缓存。

### 10.2 helper shutdown handler

建议新增 helper 内部命令或 IPC 控制处理：

```rust
async fn shutdown_helper(reason: HelperShutdownReason, deadline: Duration) -> Result<(), HelperError>
```

内部顺序：

```txt
mark_shutting_down
  -> disable shortcut handling
  -> close active session
  -> hide/destroy window
  -> unregister shortcut
  -> flush logs
  -> app.exit(0)
```

### 10.3 快捷键 shutdown guard

helper 需要一个简单 guard：

```txt
if lifecycle.is_shutting_down() {
  ignore shortcut
}
```

否则 shutdown 期间用户再次按快捷键，可能重新创建 session 或重新显示窗口。

### 10.4 Quick Create session 与进程生命周期

Quick Create session 是窗口级生命周期，不是进程生命周期。

两者关系：

```txt
helper process Running
  can contain zero or one active Quick Create session

helper process Stopping
  must close active Quick Create session before exit
```

---

## 11. 前端 bridge 设计

### 11.1 当前方向

当前前端 bridge 已经做对了一件事：

```txt
先注册 Tauri 事件监听
再 notifyFrontendReady()
```

这可以避免 helper 过早发送 `session-prepared` 事件导致前端丢事件。

### 11.2 长期约束

Quick Create 前端应继续保持：

1. session bridge 只处理外部事件监听和 ready/unready。
2. layout presenter 只处理 measure -> commitLayout -> present。
3. domain provider 只处理业务 draft、搜索、提交。
4. session reducer 只处理 session phase。

不要再把窗口生命周期、布局测量、业务搜索塞回同一个 provider。

### 11.3 退出时的前端行为

helper 进程退出时，Quick Create 前端不需要复杂保存。Quick Create 是瞬时输入窗口，不应为了退出引入大量持久化。

需要做的只有：

1. active session 标记 invalidated。
2. 停止 pending search / submit 的 UI 后续派发。
3. 释放事件监听。

---

## 12. dev 与 release 的差异

### 12.1 dev 模式

dev 模式当前会：

1. `tauri dev` 启动 Vite。
2. 主 App 使用 `devUrl`。
3. helper 也使用同一个 `devUrl`。
4. supervisor 在 debug 下强制 `cargo build -p stoneflow-helper`。

长期建议：

1. helper build 从 supervisor 状态机中拆到 `HelperBinaryResolver`。
2. dev runner 退出码单独记录，不混入 helper exit kind。
3. debug 下 shutdown 超时更宽。
4. debug 下日志更详细，但不要改变业务状态机。

### 12.2 release 模式

release 模式应：

1. helper 二进制随主 App 打包。
2. supervisor 只 resolve，不自动 build。
3. 找不到 helper 是安装完整性错误。
4. helper 协议不兼容是版本安装错误。
5. graceful shutdown 超时后再进入 OS terminate。

---

## 13. 跨平台注意点

### 13.1 Windows

Windows 重点：

1. WebView2 窗口销毁可能慢于 2 秒。
2. 强杀时容易出现窗口类 unregister 噪音。
3. `taskkill /PID` 不等于应用内 graceful shutdown。
4. 应优先让 helper 自己 `app.exit(0)`。

### 13.2 macOS

macOS 重点：

1. helper 是 Accessory app，不应抢 Dock 和主 App 激活。
2. NSPanel 的失焦和隐藏应继续由原生 delegate 管理。
3. `kill -TERM` 可作为 fallback，但不应是首选。
4. LoginItems 打包路径要和 helper resolver 对齐。

### 13.3 Linux

当前项目重点不在 Linux，但设计上应保持：

1. helper shutdown 协议优先。
2. SIGTERM 作为 fallback。
3. force kill 作为最后手段。

---

## 14. 日志与可观测性

### 14.1 日志事件

建议统一日志事件：

```txt
helper.lifecycle.start_requested
helper.lifecycle.binary_resolved
helper.lifecycle.spawned
helper.lifecycle.hello_received
helper.lifecycle.window_ready
helper.lifecycle.running
helper.lifecycle.shutdown_requested
helper.lifecycle.shutdown_ack
helper.lifecycle.exited
helper.lifecycle.terminate_fallback
helper.lifecycle.kill_fallback
helper.lifecycle.crashed
helper.lifecycle.circuit_open
```

### 14.2 日志字段

每条关键日志应包含：

```txt
pid
state
reason
attempt
deadline_ms
exit_code
exit_kind
protocol_version
helper_version
```

### 14.3 错误归类

建议错误分类：

```txt
InitializationError
ProtocolMismatch
HandshakeTimeout
WindowBootTimeout
UnexpectedExit
GracefulShutdownTimeout
TerminateFailed
ForceKillFailed
DevRunnerExit
```

### 14.4 诊断命令

建议保留或新增主 App command：

```txt
get_command_helper_status
```

返回 `HelperLifecycleSnapshot`，用于 UI 或日志面板显示 helper 当前状态。

---

## 15. 安全与权限

### 15.1 最小权限

helper 不应获得业务无关权限。原则：

1. helper 只开放 Quick Create 页面需要的 Tauri commands。
2. helper 不开放文件系统写权限。
3. helper 不开放数据库能力。
4. helper 不开放任意 shell。
5. helper 的全局快捷键权限只服务 `Option+Space`。

### 15.2 process plugin 的使用边界

如果后续引入 `tauri-plugin-process`，只建议用于明确的 frontend-triggered exit/relaunch 场景。

本方案的主退出链路不依赖前端调用 process plugin。主 App Rust 侧仍应是退出协调的权威 owner。

---

## 16. 推荐落地阶段

### 阶段 1：诊断与状态收口

目标：

1. 增强 `CommandHelperState` 或新增 `HelperLifecycleState`。
2. 区分 process / IPC / window 三类 ready。
3. 记录 last shutdown reason、exit kind、exit code。
4. 日志里区分 graceful / terminated / killed / crashed。

验收：

1. 不改变用户行为。
2. 能从日志看出 helper 是正常退出、被终止还是被强杀。
3. `get_command_helper_status` 能返回更完整快照。

### 阶段 2：显式 HelperHello

目标：

1. 在 `ipc-protocol` 增加 `HelperHello` / `HelperHelloAck`。
2. helper 启动后先发送 hello。
3. supervisor 不再把“第一个 IPC 请求”当成完整 handshake。
4. 协议不兼容时进入明确错误状态。

验收：

1. helper ready 日志包含版本、pid、capabilities。
2. handshake 超时和协议不兼容能被区分。
3. Quick Create 业务请求仍正常。

### 阶段 3：helper graceful shutdown 协议

目标：

1. 增加 `HelperShutdown` 控制请求。
2. helper 收到后内部清理并主动 `app.exit(0)`。
3. supervisor 先走 graceful shutdown，超时后才 fallback。
4. Windows 不再优先 `taskkill /PID`。

验收：

1. 托盘退出时 helper 优先 exit 0。
2. 正常退出不再出现“强制关闭 helper”日志。
3. `Chrome_WidgetWin_0` 噪音显著减少或消失。
4. helper 无响应时仍能 fallback kill。

### 阶段 4：ExitCoordinator

目标：

1. 统一 tray quit、系统退出、重启等真实退出入口。
2. 普通窗口 close 继续 hide。
3. 退出请求幂等。
4. `RunEvent::ExitRequested` / `RunEvent::Exit` 不再散落处理 helper stop。

验收：

1. 重复点击退出不会重复 shutdown。
2. tray quit 仍是真退出。
3. 普通关闭仍是隐藏。
4. 退出链路日志顺序稳定。

### 阶段 5：supervisor actor 重组

目标：

1. 使用 command channel 管理 supervisor。
2. 拆出 binary resolver、shutdown strategy、log forwarder。
3. 用 cancellation token 管理后台 task。
4. 清理同步 `wait_stopped()`。

验收：

1. 状态机单点维护。
2. 子进程句柄只由 supervisor actor 持有。
3. 健康检查、日志转发、关闭流程能被取消和等待。
4. Rust 测试覆盖启动、握手、退出、崩溃、熔断。

---

## 17. 验证计划

### 17.1 Rust 单测

需要覆盖：

1. helper lifecycle state transition。
2. restart policy。
3. expected shutdown 不触发 restart。
4. unexpected exit 触发 restart。
5. protocol mismatch 进入 circuit/error。
6. shutdown timeout fallback。

### 17.2 集成测试

需要覆盖：

1. main IPC server 可接收 `HelperHello`。
2. helper graceful shutdown 返回 ack。
3. helper business request 不受 control protocol 影响。
4. pending command open 仍能被主窗口补消费。

### 17.3 手动验收

Windows：

1. 启动 App。
2. 等 helper ready。
3. 按 `Option+Space` 打开 Quick Create。
4. 输入内容但不提交，托盘退出。
5. 观察 helper 是否 exit 0。
6. 观察是否还有强杀日志。
7. 观察是否还有 `Chrome_WidgetWin_0` 噪音。

macOS：

1. 验证 helper Accessory 不抢 Dock。
2. 验证 NSPanel 失焦隐藏。
3. 托盘或菜单退出时 helper 正常退出。

dev：

1. 验证 `tauri dev` 退出码和 App 内部 exit kind 分开记录。
2. 验证 Vite 进程关闭不污染 helper crash 状态。

release：

1. 验证 helper 路径解析。
2. 验证打包后 helper 正常启动。
3. 验证缺失 helper 时错误可读。

---

## 18. 风险与取舍

### 18.1 成本

这不是单点 bugfix，而是生命周期架构收口。会涉及：

1. `ipc-protocol`。
2. `desktop-app/app/supervisor`。
3. `desktop-app/app/helper_runtime`。
4. `helper-app` runtime。
5. Quick Create frontend ready/unready 诊断。

因此不建议一次性重写全部。

### 18.2 最大收益

最大收益来自阶段 3：

```txt
helper graceful shutdown 协议
```

它直接改善当前退出异常日志，也让 helper 有机会正常清理 WebView2 和全局快捷键。

### 18.3 最大风险

最大风险是把生命周期改成过度抽象系统。

控制原则：

1. 只抽当前确实存在的状态。
2. 只为 main/helper 生命周期建模，不做通用 workflow engine。
3. 先增强可观测性，再改关闭协议，再重组 actor。
4. 每阶段都保留 fallback kill。

---

## 19. 最终推荐

长期最终形态：

```txt
Main App
  -> owns database
  -> owns business services
  -> owns IPC server
  -> owns ExitCoordinator
  -> owns HelperSupervisor

Helper
  -> owns global shortcut
  -> owns Quick Create window
  -> owns popup session runtime
  -> never owns database or business rules

Protocol
  -> explicit hello
  -> explicit shutdown
  -> explicit window ready
  -> versioned business requests
```

第一优先级：

```txt
补 helper graceful shutdown 协议。
```

第二优先级：

```txt
补显式 HelperHello 和生命周期快照。
```

第三优先级：

```txt
重组 supervisor actor 与 ExitCoordinator。
```

这个顺序能先解决当前真实痛点，再逐步把架构拉到长期可维护状态，不会一次性引入过多重构风险。
