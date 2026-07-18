# StoneFlow 独立窗口技术方案：Core-first 双 Tauri App 架构

> **版本**：v1.0
> **状态**：架构方案落地稿
> **适用阶段**：StoneFlow 桌面端独立窗口、全局命令框、Sticky、Tray、全局快捷键、跨平台窗口能力建设
> **核心结论**：采用 **Core-first 双 Tauri App 架构**。Main Core 是数据与领域真源，Helper Shell 是系统入口与独立窗口管理层。

---

## 0. 一句话结论

StoneFlow 不应该被设计成「一个主窗口 + 若干附属窗口」的普通桌面应用，而应该被设计成：

```txt
Main Core 常驻作为 StoneFlow 的系统核心
Helper Shell 作为 Core 派生出来的系统入口层
Main Window / Quick Window / Sticky Window 都只是 Core 能力的不同 UI 投影
```

最终架构：

```txt
StoneFlow Main Core
├─ SQLite / Migration
├─ Domain / UseCases
├─ Search / Command Backend
├─ IPC Server
├─ Event Bus
├─ Main Window
├─ Helper Supervisor
└─ App Lifecycle Controller

StoneFlow Helper Shell
├─ IPC Client
├─ Global Shortcut
├─ Tray
├─ Quick Window
├─ Sticky Window
├─ Window Placement
└─ Platform Window Adapter
   ├─ macOS: NSPanel / tauri-nspanel
   └─ Windows: Topmost WebviewWindow
```

核心边界：

```txt
Core owns Helper.
Helper depends on Core.
Helper does not own Core.
Helper never directly accesses SQLite.
```

---

## 1. 背景与目标

### 1.1 产品背景

StoneFlow 的目标不是做一个普通 Todo List，而是一个长期演进的桌面效率系统。它的关键体验不是「打开 App 后管理任务」，而是：

- 随时随地全局唤起。
- 快速捕获任务、想法、命令。
- 支持像 Raycast / Spotlight 一样的命令框体验。
- 支持像系统贴纸一样的 Sticky，能够跨 Space / 全屏 App 显示。
- 主窗口只是完整管理界面，不是应用生命周期本身。
- 本地优先，SQLite 作为本地数据真源。
- macOS 和 Windows 都要长期支持。

因此，StoneFlow 的桌面架构必须从一开始就把 **全局入口、窗口生命周期、数据真源、跨平台窗口行为** 分开设计。

### 1.2 核心需求

#### 1.2.1 性能需求

- Quick Window 唤起要快。
- 快捷键响应路径要短。
- Quick Window / Sticky Window 应懒创建并复用。
- Helper 不应加载完整 Main AppShell。
- Quick UI 应作为独立轻量 UI 入口。
- Core 启动完成前，Helper 不启动，避免半可用状态。

#### 1.2.2 跨平台需求

必须支持：

- macOS。
- Windows。
- 多显示器。
- 不同缩放比例。
- 窗口坐标恢复。
- 不同平台的置顶、焦点、任务栏 / Dock 行为差异。

#### 1.2.3 macOS 特殊需求

macOS 是独立窗口方案的难点。需要重点支持：

- 多 Space。
- 全屏 App 上显示 Quick Window。
- Sticky 像系统贴纸一样跨 Space / 全屏 App。
- 不污染 Main App 的正常 Dock / Menu / Focus 行为。
- 必要时使用 NSPanel，而不是普通 Tauri Window。

#### 1.2.4 生命周期需求

最终拍板的生命周期原则：

```txt
Core-first
Helper 必须由 Core 启动
Helper 崩溃后由 Core 重启
Core 未 ready 时 Helper 不启动
Core 退出时 Helper 退出
```

这意味着 StoneFlow 的启动入口是 Main Core，而不是 Helper。

---

## 2. 非目标

本方案不解决以下问题：

- 命令框的完整产品交互设计。
- 命令框命令体系的完整领域建模。
- Task / Project / Space 的完整数据模型。
- 云同步方案。
- 多端协同方案。
- 插件市场或第三方扩展机制。
- 具体 UI 视觉样式设计。

但本方案会为这些后续能力预留边界。

---

## 3. 第一性原则

### 3.1 数据真源唯一

只有 Main Core 可以直接访问 SQLite。

```txt
Main Core → SQLite
Helper Shell → IPC → Main Core → SQLite
```

Helper 不允许：

- 直接打开 SQLite。
- 直接读取数据库表。
- 直接执行 migration。
- 拥有长期业务状态。
- 绕过 UseCase 修改数据。

原因：

- 避免双写。
- 避免数据库锁争用。
- 避免 migration 时状态不一致。
- 保证所有业务规则都通过 Core 执行。
- 方便后续加搜索索引、同步、权限、审计、事件流。

### 3.2 生命周期单向依赖

最终依赖方向：

```txt
Main Core → starts / supervises → Helper Shell
Helper Shell → connects to → Main Core
```

不允许：

```txt
Helper Shell → owns / boots / controls → Main Core
```

原因：

- StoneFlow 的核心是数据与领域系统，不是快捷入口。
- Core 初始化成功后，Helper 才有意义。
- Core 可以明确判断 Helper 是否可用、是否需要重启。
- Core 可以统一控制 quit-all。

### 3.3 Main Window 不是 StoneFlow 本体

必须明确：

```txt
Main Core ≠ Main Window
```

Main Window 只是 Main Core 创建的一个业务窗口。用户关闭 Main Window 时，不代表 StoneFlow 退出。

推荐行为：

```txt
关闭 Main Window
  ↓
隐藏窗口
  ↓
Core 继续运行
  ↓
Helper 继续运行
  ↓
快捷键 / Tray / Sticky 继续可用
```

### 3.4 Helper 可以快，但不能聪明

Helper 的核心职责是系统入口和窗口管理，不是业务系统。

Helper 可以：

- 注册快捷键。
- 管理 Tray。
- 创建 Quick Window。
- 创建 Sticky Window。
- 做窗口定位。
- 做平台窗口适配。
- 维护短期 runtime state。

Helper 不应该：

- 访问 SQLite。
- 判断复杂业务规则。
- 长期缓存任务数据。
- 成为任务状态真源。
- 在 Core 未 ready 时提供伪可用业务功能。

### 3.5 平台能力统一抽象，不强行统一实现

macOS 和 Windows 的窗口系统差异很大，不应该强行把底层实现做成一样。

最终策略：

```txt
统一上层接口：QuickWindow / StickyWindow / WindowPlacement
平台分别实现：
  macOS → NSPanel / tauri-nspanel
  Windows → Topmost WebviewWindow
```

这符合 KISS，也避免为了表面统一引入大量 hack。

### 3.6 KISS / DRY / 可持续发展

本方案遵守：

- **KISS**：本地 IPC 不引入 gRPC / GraphQL / HTTP Server。
- **DRY**：协议类型、错误类型、窗口抽象集中维护。
- **单一职责**：Core 管数据，Helper 管系统入口。
- **可恢复**：Helper 崩溃可重启，IPC 断开可重连。
- **可演进**：协议版本化，能力通过 capabilities 渐进启用。
- **可测试**：生命周期、IPC、窗口行为都有独立测试边界。

---

## 4. 方案对比与最终选择

### 4.1 方案 A：单 Tauri App 多窗口

结构：

```txt
Single Tauri App
├─ Main Window
├─ Quick Window
├─ Sticky Window
├─ Tray
├─ Global Shortcut
└─ SQLite
```

优点：

- 实现简单。
- 打包简单。
- IPC 成本低。
- 状态共享容易。

缺点：

- 主窗口和系统入口生命周期容易耦合。
- macOS NSPanel 行为可能污染主应用。
- Helper 崩溃隔离性差。
- Tray、快捷键、Sticky 和主窗口边界不清楚。
- 长期会变成一个巨大的 Core + UI 混合体。

结论：

```txt
适合早期 Demo，不适合作为 StoneFlow 最终方案。
```

### 4.2 方案 B：双 App，Helper-first

结构：

```txt
Helper Shell 先启动
  ↓
Helper 拉起 Main Core
  ↓
Main Core 提供数据服务
```

优点：

- 全局入口最早可用。
- 类似部分系统工具的常驻模式。

缺点：

- 生命周期方向与 StoneFlow 产品本质相反。
- Core 未 ready 时，Helper 会出现半可用状态。
- Helper 需要承担启动 Core 的职责，边界变重。
- 容易演化成 Helper 过度聪明。

结论：

```txt
不符合 Core-first 原则，放弃。
```

### 4.3 方案 C：双 App，Core-first

结构：

```txt
Main Core 先启动
  ↓
Core 完成 SQLite / Migration / IPC 初始化
  ↓
Core 启动 Helper
  ↓
Helper 连接 Core
  ↓
Helper 注册快捷键 / Tray / Quick / Sticky
```

优点：

- 数据真源明确。
- 生命周期干净。
- Helper 受 Core 监督。
- Core 未 ready 时不暴露业务入口。
- macOS 独立窗口可以集中放在 Helper。
- Main Window 和系统入口解耦。
- 适合长期演进。

缺点：

- 双 App 打包复杂。
- 需要本地 IPC。
- 需要 Helper Supervisor。
- macOS / Windows 要分别做窗口适配。

最终结论：

```txt
采用方案 C：Core-first 双 Tauri App。
```

---

## 5. 总体架构

### 5.1 进程模型

```txt
StoneFlow Main Core App
├─ 负责数据、领域、IPC、主窗口、生命周期
└─ 启动并监督 Helper Shell

StoneFlow Helper Shell App
├─ 负责系统入口、快捷键、Tray、Quick Window、Sticky Window
└─ 通过 IPC 访问 Main Core
```

### 5.2 总体关系图

```txt
┌──────────────────────────────────────────────┐
│              StoneFlow Main Core              │
│                                              │
│  ┌────────────┐   ┌────────────┐             │
│  │  SQLite    │   │ Migration  │             │
│  └─────┬──────┘   └─────┬──────┘             │
│        │                │                    │
│  ┌─────▼────────────────▼─────┐              │
│  │      Domain / UseCases      │              │
│  └─────┬──────────────────────┘              │
│        │                                      │
│  ┌─────▼─────┐   ┌────────────┐              │
│  │ Event Bus │   │ IPC Server │◄────────┐     │
│  └─────┬─────┘   └────────────┘         │     │
│        │                                │     │
│  ┌─────▼──────┐                         │     │
│  │Main Window │                         │     │
│  └────────────┘                         │     │
│                                         │     │
│  ┌───────────────────┐                  │     │
│  │ Helper Supervisor │──────────────────┘     │
│  └───────────────────┘                        │
└──────────────────────────────────────────────┘
                    ▲
                    │ Local IPC
                    ▼
┌──────────────────────────────────────────────┐
│              StoneFlow Helper Shell           │
│                                              │
│  ┌────────────┐   ┌────────────────┐         │
│  │ IPC Client │   │ Global Shortcut│         │
│  └─────┬──────┘   └────────────────┘         │
│        │                                      │
│  ┌─────▼─────┐   ┌───────────────┐           │
│  │   Tray    │   │ Quick Window  │           │
│  └───────────┘   └───────────────┘           │
│                                              │
│  ┌───────────────┐   ┌────────────────────┐  │
│  │ Sticky Window │   │ Platform Adapter   │  │
│  └───────────────┘   └────────────────────┘  │
└──────────────────────────────────────────────┘
```

### 5.3 职责表

| 模块 | 职责 | 不负责 |
|---|---|---|
| Main Core | SQLite、Migration、Domain、UseCase、IPC Server、Event Bus、Main Window、Helper Supervisor | Quick / Sticky 的平台窗口细节 |
| Helper Shell | 快捷键、Tray、Quick Window、Sticky Window、窗口定位、平台窗口适配 | SQLite、Migration、核心业务规则 |
| Main Window | 完整业务管理 UI | 生命周期 owner |
| Quick Window | 命令框、搜索、快速动作、快速创建 | 数据真源 |
| Sticky Window | 桌面贴纸 UI、窗口位置、置顶/跨 Space 行为 | 业务状态真源 |
| IPC Protocol | Core 与 Helper 的稳定通信契约 | 业务 UI 细节 |

---

## 6. 生命周期设计

### 6.1 正常启动链路

```txt
用户启动 StoneFlow
  ↓
Main Core 进程启动
  ↓
Single Instance 校验
  ↓
初始化日志 / 配置 / App State
  ↓
打开 SQLite
  ↓
执行 Migration
  ↓
初始化 Domain / UseCases
  ↓
初始化 Event Bus
  ↓
启动 IPC Server
  ↓
CoreIpcReady
  ↓
Helper Supervisor 启动 Helper
  ↓
Helper 进程启动
  ↓
Helper Single Instance 校验
  ↓
Helper 连接 Core IPC
  ↓
握手校验 appVersion / protocolVersion / schemaVersion
  ↓
Helper 注册 Global Shortcut
  ↓
Helper 创建 Tray
  ↓
Quick Window / Sticky Window 进入可用状态
```

### 6.2 Ready 状态拆分

不能只有一个 `ready`，否则会出现半初始化状态。

#### 6.2.1 CoreProcessReady

含义：Core 进程基础设施已就绪。

条件：

- Tauri Runtime 已启动。
- single-instance 已校验。
- 日志系统已初始化。
- 配置目录已定位。
- 基础环境检查完成。

#### 6.2.2 CoreDataReady

含义：数据层已就绪。

条件：

- SQLite 已打开。
- migration 已完成。
- schemaVersion 已确认。
- domain services 已注册。
- repository 已可用。

#### 6.2.3 CoreIpcReady

含义：Core 可以接受 Helper 连接。

条件：

- IPC Server 已监听。
- protocol registry 已加载。
- event bus 已可用。
- CoreDataReady 已完成。

#### 6.2.4 HelperReady

含义：Helper 已经可以提供系统入口。

条件：

- Helper 进程已启动。
- IPC 连接成功。
- 握手通过。
- 快捷键注册完成。
- Tray 创建完成。
- 平台窗口能力初始化完成。

### 6.3 Core-first 约束

严格约束：

```txt
CoreIpcReady 之前，不启动 Helper。
```

原因：

- 避免快捷键触发后 Core 不可用。
- 避免 Tray 菜单出现但业务不可用。
- 避免 Sticky 恢复时读不到数据。
- 避免 Helper 变成半独立系统。

### 6.4 主窗口关闭流程

```txt
用户关闭 Main Window
  ↓
拦截 close event
  ↓
hide Main Window
  ↓
Core 继续运行
  ↓
Helper 继续运行
  ↓
Tray / Shortcut / Quick / Sticky 继续可用
```

原则：

```txt
关闭窗口 ≠ 退出应用
```

### 6.5 真正退出流程

```txt
用户选择 Quit StoneFlow
  ↓
Core 收到 quit-all
  ↓
Core 设置 shuttingDown = true
  ↓
Core 通知 Helper prepare-shutdown
  ↓
Helper 注销快捷键
  ↓
Helper 关闭 Tray
  ↓
Helper 关闭 Quick / Sticky windows
  ↓
Helper 退出
  ↓
Core flush event / pending state
  ↓
Core 关闭 SQLite
  ↓
Core 退出
```

### 6.6 Helper 崩溃恢复

需求已拍板：Helper 要自动重启。

```txt
Helper unexpected exit
  ↓
Core Helper Supervisor 检测退出
  ↓
判断 exit reason
  ↓
unexpected exit → backoff restart
  ↓
Helper reconnect
  ↓
重新注册快捷键 / Tray
  ↓
恢复 Quick / Sticky runtime state
```

需要区分两种退出：

| 类型 | 处理 |
|---|---|
| intentional exit | 不重启 |
| unexpected exit | 自动重启 |

intentional exit 来源：

- Core 发出的 prepare-shutdown。
- 用户主动 Quit StoneFlow。
- Core 要更新 Helper。
- 开发模式下手动停止。

unexpected exit 来源：

- Helper crash。
- Helper 被系统杀掉。
- Helper 被用户从任务管理器 / 活动监视器杀掉。

### 6.7 Core 崩溃时 Helper 行为

```txt
Core crash
  ↓
Helper IPC disconnected
  ↓
Helper 进入 degraded
  ↓
隐藏 Quick Window
  ↓
Sticky 可选择隐藏或只显示错误态
  ↓
Helper 尝试短暂等待 Core
  ↓
Core 未恢复 → Helper 退出
```

重要原则：

```txt
Helper 不反向启动 Core。
```

这样保证生命周期方向始终清晰。

---

## 7. Main Core 设计

### 7.1 Core 职责

Main Core 是 StoneFlow 的系统核心，负责：

- App 单实例入口。
- SQLite 打开与关闭。
- 数据库 migration。
- schemaVersion 管理。
- 领域模型。
- UseCases。
- 搜索索引。
- 命令执行后端。
- IPC Server。
- Event Bus。
- Main Window。
- Helper Supervisor。
- App Lifecycle Controller。
- 设置管理。
- 错误恢复与降级。

### 7.2 Core 不应该做什么

Core 不应该直接负责：

- 注册全局快捷键。
- 创建 Tray 细节。
- 处理 macOS NSPanel 具体行为。
- 处理 Windows Topmost 窗口具体行为。
- 管理 Quick Window 的 UI 细节。
- 管理 Sticky Window 的拖拽、显示、隐藏细节。

Core 可以知道 Quick / Sticky 的业务数据，但不应该知道它们的所有窗口实现细节。

### 7.3 Core 模块划分

推荐目录：

```txt
apps/main-core/src/
├─ bootstrap/
│  ├─ mod.rs
│  ├─ init_logging.rs
│  ├─ init_config.rs
│  └─ init_single_instance.rs
│
├─ lifecycle/
│  ├─ mod.rs
│  ├─ app_state.rs
│  ├─ shutdown.rs
│  └─ ready_state.rs
│
├─ database/
│  ├─ mod.rs
│  ├─ connection.rs
│  ├─ migration.rs
│  └─ schema_version.rs
│
├─ domain/
│  └─ mod.rs
│
├─ usecases/
│  ├─ mod.rs
│  ├─ task_usecases.rs
│  ├─ project_usecases.rs
│  ├─ sticky_usecases.rs
│  └─ command_usecases.rs
│
├─ search/
│  ├─ mod.rs
│  ├─ index.rs
│  └─ query.rs
│
├─ ipc_server/
│  ├─ mod.rs
│  ├─ handlers.rs
│  ├─ router.rs
│  └─ event_stream.rs
│
├─ event_bus/
│  ├─ mod.rs
│  ├─ events.rs
│  └─ broadcaster.rs
│
├─ main_window/
│  ├─ mod.rs
│  ├─ create.rs
│  └─ commands.rs
│
├─ helper_supervisor/
│  ├─ mod.rs
│  ├─ process.rs
│  ├─ restart_policy.rs
│  ├─ state.rs
│  └─ version_check.rs
│
└─ settings/
   ├─ mod.rs
   ├─ app_settings.rs
   └─ shortcut_settings.rs
```

### 7.4 Core 内部依赖方向

推荐依赖方向：

```txt
bootstrap
  ↓
lifecycle
  ↓
database
  ↓
domain / usecases
  ↓
ipc_server / main_window / helper_supervisor
```

不要让底层 domain 反向依赖 Tauri、窗口、IPC。

---

## 8. Helper Shell 设计

### 8.1 Helper 职责

Helper 是系统入口层，负责：

- App 单实例入口。
- IPC Client。
- Global Shortcut。
- Tray。
- Quick Window。
- Sticky Window。
- Window Placement。
- macOS NSPanel 适配。
- Windows Topmost Window 适配。
- 快捷键注册状态。
- 窗口 runtime state。

### 8.2 Helper 不应该做什么

Helper 不应该：

- 直接访问 SQLite。
- 执行 migration。
- 保存长期任务数据。
- 持有完整 Project / Task / Space 状态。
- 实现复杂业务规则。
- 反向启动 Core。
- 在 Core 未 ready 时提供业务功能。

### 8.3 Helper 模块划分

推荐目录：

```txt
apps/helper-shell/src/
├─ bootstrap/
│  ├─ mod.rs
│  ├─ init_logging.rs
│  ├─ init_single_instance.rs
│  └─ init_platform.rs
│
├─ ipc_client/
│  ├─ mod.rs
│  ├─ connect.rs
│  ├─ handshake.rs
│  ├─ request.rs
│  ├─ event_subscriber.rs
│  └─ reconnect.rs
│
├─ shortcut/
│  ├─ mod.rs
│  ├─ register.rs
│  ├─ unregister.rs
│  ├─ conflict.rs
│  └─ actions.rs
│
├─ tray/
│  ├─ mod.rs
│  ├─ menu.rs
│  ├─ events.rs
│  └─ actions.rs
│
├─ quick_window/
│  ├─ mod.rs
│  ├─ create.rs
│  ├─ show.rs
│  ├─ hide.rs
│  ├─ state.rs
│  └─ commands.rs
│
├─ sticky_window/
│  ├─ mod.rs
│  ├─ create.rs
│  ├─ restore.rs
│  ├─ position.rs
│  ├─ state.rs
│  └─ commands.rs
│
├─ window_placement/
│  ├─ mod.rs
│  ├─ monitor.rs
│  ├─ cursor.rs
│  ├─ dpi.rs
│  └─ restore.rs
│
├─ platform/
│  ├─ mod.rs
│  ├─ macos/
│  │  ├─ mod.rs
│  │  ├─ panel_factory.rs
│  │  ├─ quick_panel.rs
│  │  ├─ sticky_panel.rs
│  │  ├─ panel_level.rs
│  │  └─ space_behavior.rs
│  │
│  └─ windows/
│     ├─ mod.rs
│     ├─ topmost_window.rs
│     ├─ taskbar.rs
│     └─ dpi.rs
│
└─ runtime_state/
   ├─ mod.rs
   ├─ helper_state.rs
   └─ window_state.rs
```

### 8.4 Helper Runtime State

Helper 可以保存短期运行态，例如：

- IPC 是否连接。
- Helper 是否 ready。
- 快捷键是否注册成功。
- Tray 是否创建成功。
- Quick Window 是否已创建。
- Quick Window 当前是否可见。
- Sticky Window 的窗口实例状态。
- 最近一次显示 Quick Window 的 monitor。

Helper 不应该保存长期业务数据，例如：

- 全量任务列表。
- Project 数据。
- Space 数据。
- 完整 Sticky 内容。

长期业务数据必须来自 Core。

---

## 9. Helper Supervisor

### 9.1 定位

Helper Supervisor 是 Main Core 内的一个模块，负责 Helper 的启动、停止、监控、重启、版本校验。

它不是业务模块，而是生命周期模块。

### 9.2 状态机

```txt
NotStarted
  ↓
Starting
  ↓
Connecting
  ↓
Ready
  ↓
Degraded
  ↓
Restarting
  ↓
Stopped
```

### 9.3 状态说明

| 状态 | 含义 |
|---|---|
| NotStarted | Helper 尚未启动 |
| Starting | Core 正在拉起 Helper 进程 |
| Connecting | Helper 已启动，但 IPC 尚未完成握手 |
| Ready | Helper 正常工作 |
| Degraded | Helper 异常或部分能力不可用 |
| Restarting | Core 正在按策略重启 Helper |
| Stopped | Helper 已停止，不再自动重启 |

### 9.4 Supervisor 职责

```txt
helper_supervisor
├─ locate_helper_binary
├─ validate_helper_version
├─ start_helper
├─ wait_for_connection
├─ observe_process_exit
├─ classify_exit_reason
├─ restart_with_backoff
├─ stop_helper
├─ send_prepare_shutdown
└─ expose_helper_status
```

### 9.5 重启策略

推荐 backoff 策略：

```txt
第 1 次：立即重启
第 2 次：1s 后重启
第 3 次：3s 后重启
第 4 次：10s 后重启
超过阈值：进入 degraded，提示用户
```

需要避免无限 crash loop。

### 9.6 intentional exit 标记

Core 发送关闭 Helper 前，需要标记：

```txt
helper_exit_expected = true
```

Helper 如果在这个期间退出，不触发重启。

### 9.7 Helper 版本校验

Core 启动 Helper 前和握手时都应该校验：

- appVersion。
- protocolVersion。
- minProtocolVersion。
- platform。
- capabilities。

版本不兼容时：

```txt
阻止 Helper 进入 Ready
主窗口展示错误
日志记录具体原因
```

---

## 10. IPC 技术方案

### 10.1 IPC 选型

最终选择：

```txt
macOS: Unix Domain Socket
Windows: Named Pipe
Protocol: JSON-RPC-like + event stream
Framing: length-prefixed JSON
```

### 10.2 为什么不使用 HTTP

不选择本地 HTTP Server 的原因：

- 对本地双进程通信偏重。
- 需要管理端口占用。
- 安全面更大。
- 不适合桌面 App 内部私有协议。
- request / event stream 需要额外设计。

### 10.3 为什么不使用 GraphQL

不选择 GraphQL 的原因：

- StoneFlow 的 Core / Helper 通信更多是命令型，而不是页面查询型。
- GraphQL schema 对本地命令执行过重。
- 对事件流、窗口控制、快捷键动作并不自然。

### 10.4 为什么不使用 gRPC

不选择 gRPC 的原因：

- 引入 proto、build、stream、生成代码复杂度。
- 对桌面本地 IPC 来说偏重。
- 调试成本高于 JSON。
- 初期不符合 KISS。

### 10.5 JSON-RPC-like 协议

请求：

```ts
type RpcRequest = {
  jsonrpc: "2.0";
  id: string;
  method: string;
  params?: unknown;
};
```

响应：

```ts
type RpcResponse<T = unknown> = {
  jsonrpc: "2.0";
  id: string;
  result?: T;
  error?: RpcError;
};
```

错误：

```ts
type RpcError = {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
};
```

事件：

```ts
type RpcEvent<T = unknown> = {
  type: "event";
  event: string;
  seq: number;
  payload: T;
};
```

### 10.6 Framing

推荐使用 length-prefixed JSON：

```txt
[4 bytes length][json payload]
[4 bytes length][json payload]
[4 bytes length][json payload]
```

原因：

- 避免 newline-delimited JSON 遇到转义和分包问题。
- 比纯文本 delimiter 更稳。
- 实现简单。
- 方便后续压缩或二进制协议升级。

### 10.7 握手协议

Core 握手信息：

```ts
type CoreHandshake = {
  app: "stoneflow";
  role: "core";
  appVersion: string;
  protocolVersion: string;
  minProtocolVersion: string;
  schemaVersion: number;
  coreBootId: string;
  coreStartedAt: string;
  dataReady: true;
  capabilities: string[];
};
```

Helper 握手信息：

```ts
type HelperHandshake = {
  app: "stoneflow";
  role: "helper";
  appVersion: string;
  protocolVersion: string;
  minProtocolVersion: string;
  helperBootId: string;
  platform: "macos" | "windows";
  capabilities: string[];
};
```

握手校验：

| 字段 | 目的 |
|---|---|
| app | 防止误连 |
| role | 防止 Helper 连 Helper / Core 连 Core |
| appVersion | 保证同包版本一致 |
| protocolVersion | 保证协议兼容 |
| minProtocolVersion | 支持兼容区间判断 |
| schemaVersion | 防止数据库 schema 与协议不匹配 |
| coreBootId | 判断 Core 是否重启过 |
| helperBootId | 判断 Helper 是否重启过 |
| capabilities | 渐进启用能力 |

### 10.8 协议版本策略

推荐版本：

```txt
appVersion: 1.4.0
protocolVersion: 1.2.0
schemaVersion: 8
```

规则：

| 变化 | 处理 |
|---|---|
| UI 变化 | appVersion |
| IPC 增加可选字段 | protocol minor |
| IPC 破坏性变化 | protocol major |
| DB schema 变化 | schemaVersion |
| Main / Helper 协议不兼容 | 阻止连接 |

### 10.9 IPC 方法规划

#### System

```txt
system.handshake
system.ping
system.getStatus
system.getCapabilities
system.prepareShutdown
```

#### App

```txt
app.showMainWindow
app.hideMainWindow
app.toggleMainWindow
app.quitAll
app.openSettings
```

#### Quick

```txt
quick.open
quick.close
quick.query
quick.execute
quick.getInitialState
```

#### Command

```txt
command.search
command.execute
command.getRecent
command.getRegistry
```

#### Task

```txt
quick.create
quick.search
task.complete
task.update
task.open
```

#### Project

```txt
project.search
project.list
project.open
```

#### Sticky

```txt
sticky.list
sticky.create
sticky.update
sticky.close
sticky.restore
sticky.pin
sticky.unpin
```

#### Settings

```txt
settings.get
settings.update
settings.getShortcuts
settings.updateShortcuts
```

### 10.10 Event Stream

Core 广播事件：

```txt
core.ready
core.shuttingDown
core.degraded
settings.changed
shortcut.changed
currentSpace.changed
task.created
task.updated
task.completed
project.created
project.updated
sticky.created
sticky.updated
sticky.closed
command.registryChanged
```

事件必须带 seq：

```ts
type RpcEvent<T = unknown> = {
  type: "event";
  event: string;
  seq: number;
  payload: T;
  emittedAt: string;
};
```

用途：

- Helper 可以检测事件是否丢失。
- 日志可以串联。
- 后续可以做断线恢复。

### 10.11 超时与重试

建议：

| 请求类型 | 超时 | 重试 |
|---|---:|---|
| ping | 1s | 可重试 |
| quick.query | 300ms - 800ms | 不自动重试，直接更新 UI |
| command.execute | 2s - 5s | 根据 idempotencyKey 判断 |
| quick.create | 2s | 可在 Core 侧去重 |
| app.quitAll | 5s | 不重复执行 |

### 10.12 幂等性

写操作建议带：

```ts
type IdempotentRequest = {
  idempotencyKey: string;
};
```

尤其是：

- quick.create。
- sticky.create。
- command.execute。

避免 IPC 重试导致重复创建任务。

---

## 11. Quick Window 技术方案

### 11.1 定位

Quick Window 的最终定位是：

```txt
命令框优先
快速输入只是命令框能力之一
```

它不是一个简单的「新建任务输入框」，而是 StoneFlow 的全局命令入口。

### 11.2 Quick Window 能力边界

Quick Window 应支持：

- 搜索任务。
- 搜索项目。
- 执行动作。
- 快速创建任务。
- 跳转主窗口页面。
- 打开 Sticky。
- 执行系统命令。
- 展示最近命令。

但不应该：

- 加载完整 Main AppShell。
- 承担完整任务管理页面。
- 持有完整数据状态。
- 直接访问数据库。

### 11.3 生命周期

```txt
HelperReady
  ↓
用户按快捷键
  ↓
如果 Quick Window 不存在 → 懒创建
  ↓
计算当前显示器位置
  ↓
show + focus
  ↓
加载 initial state
  ↓
用户输入 query
  ↓
Helper 通过 IPC 请求 Core 查询
  ↓
Core 返回 command results
  ↓
用户选择 command
  ↓
Helper 通过 IPC 请求 Core execute
  ↓
Core 执行业务
  ↓
Core 广播事件
  ↓
Quick Window hide
```

### 11.4 创建策略

推荐：

```txt
懒创建 + 复用 + hide instead of close
```

不要每次打开都 destroy / recreate。

原因：

- 减少白屏。
- 减少 WebView 创建成本。
- 保持输入体验稳定。
- 方便动画和焦点控制。

### 11.5 UI 加载策略

Quick UI 必须独立于 Main UI。

推荐结构：

```txt
packages/quick-ui/
├─ src/
│  ├─ App.tsx
│  ├─ CommandInput.tsx
│  ├─ ResultList.tsx
│  ├─ ResultItem.tsx
│  ├─ EmptyState.tsx
│  ├─ LoadingState.tsx
│  └─ quick-store.ts
```

不要依赖：

- AppShell。
- Sidebar。
- MainCard。
- 大型页面路由。
- 完整业务列表组件。

可以复用：

- 基础 UI 组件。
- token。
- icon。
- shared types。
- command result item 的基础样式。

### 11.6 Quick Window 状态机

```txt
Idle
  ↓
Opening
  ↓
Focused
  ↓
Querying
  ↓
ShowingResults
  ↓
Executing
  ↓
Closing
  ↓
Hidden
```

错误状态：

```txt
Disconnected
CoreBusy
CommandFailed
ShortcutConflict
```

### 11.7 Quick 性能约束

目标：

- 快捷键触发后尽快 show。
- 首次创建允许稍慢，但应可接受。
- 后续打开必须明显快。
- 搜索请求要能取消过期结果。

建议：

- UI 包体独立。
- 不加载大列表。
- 不加载非必要 provider。
- 输入 query debounce。
- 请求带 requestId，丢弃旧响应。
- Core 侧提供 command.search 聚合接口，避免 Helper 多次请求。

### 11.8 Quick 与 Core 的接口

```txt
quick.getInitialState
command.search
command.execute
```

示例：

```ts
type CommandSearchRequest = {
  query: string;
  limit: number;
  context: {
    currentSpaceId?: string;
    source: "quick-window";
  };
};

type CommandSearchResult = {
  items: CommandItem[];
};

type CommandItem = {
  id: string;
  type: "task" | "project" | "action" | "sticky" | "navigation";
  title: string;
  subtitle?: string;
  icon?: string;
  shortcutHint?: string;
  action: CommandAction;
};
```

---

## 12. Sticky Window 技术方案

### 12.1 定位

Sticky Window 的定位是：

```txt
像系统贴纸一样跨 Space / 全屏 App 的桌面常驻窗口。
```

它不是普通弹窗，也不是 Main Window 的子窗口。

### 12.2 数据与窗口分离

```txt
Sticky 数据：Main Core / SQLite
Sticky 窗口：Helper Shell
Sticky UI：Helper 内 WebView / Panel
```

Sticky 内容、绑定任务、所属项目、是否归档等业务状态由 Core 管。

Sticky 的窗口位置、当前显示状态、临时尺寸、拖拽中状态由 Helper 管。

### 12.3 Sticky 生命周期

```txt
Core 有 Sticky 数据
  ↓
Helper 收到 sticky.restore / sticky.created event
  ↓
Helper 创建 Sticky Window / Panel
  ↓
从 Core 获取 Sticky 内容
  ↓
显示在指定 monitor / Space
  ↓
用户编辑
  ↓
Helper 通过 IPC 提交 update
  ↓
Core 写 SQLite
  ↓
Core 广播 sticky.updated
```

### 12.4 Sticky 类型

可以预留以下类型：

| 类型 | 说明 |
|---|---|
| Normal Sticky | 普通桌面贴纸 |
| Pinned Sticky | 固定在所有 Space / 全屏 App |
| Task-bound Sticky | 绑定某个任务 |
| Project-bound Sticky | 绑定某个项目 |
| Temporary Sticky | 临时便签，可自动收起 |

### 12.5 Sticky 行为

推荐支持：

- 拖动。
- 改变尺寸。
- Pin / Unpin。
- Collapse / Expand。
- 关闭但不删除。
- 删除需要二次确认或可撤销。
- 记住显示器与相对位置。
- 显示器不存在时迁移到主屏幕。

### 12.6 Sticky 不应该做什么

Sticky Window 不应该：

- 直接写 SQLite。
- 持有长期数据真源。
- 执行复杂任务规则。
- 和 Main Window 共享复杂页面状态。

---

## 13. macOS 窗口方案

### 13.1 为什么需要 NSPanel

普通 Tauri Window 可以满足基本窗口能力，但对于 StoneFlow 的 macOS 独立窗口需求不够稳。

特别是：

- Quick Window 需要类似 Spotlight / Raycast 的体验。
- Sticky 需要跨 Space / 全屏 App。
- 普通 always-on-top 不等于能稳定显示在全屏空间上。
- Main App 的 Dock / Focus 行为不应该被 Quick / Sticky 污染。

因此 macOS 上应使用 NSPanel 能力。

### 13.2 `tauri-nspanel` 接入原则

`tauri-nspanel` 只放在 Helper Shell 的 macOS platform adapter 中。

不要放进 Main Core。

推荐结构：

```txt
apps/helper-shell/src/platform/macos/
├─ panel_factory.rs
├─ quick_panel.rs
├─ sticky_panel.rs
├─ panel_level.rs
├─ space_behavior.rs
└─ focus_behavior.rs
```

### 13.3 Quick Panel 设计

Quick Panel 推荐行为：

```txt
NSPanel
├─ floating
├─ canBecomeKeyWindow
├─ showAndMakeKey
├─ hide on blur
├─ hide on Esc
├─ no Dock item
├─ no normal title bar
├─ lazy create
└─ reuse
```

Quick Panel 需要获得键盘焦点，因为命令框需要输入。

### 13.4 Sticky Panel 设计

Sticky Panel 推荐行为：

```txt
NSPanel
├─ canJoinAllSpaces
├─ fullScreenAuxiliary
├─ floating / modalPanel level
├─ draggable
├─ resizable
├─ remembers position
├─ optional pin
└─ optional collapse
```

Sticky 和 Quick 的差异：

| 项 | Quick Panel | Sticky Panel |
|---|---|---|
| 目的 | 短暂命令入口 | 长期桌面贴纸 |
| 焦点 | 需要 focus | 不一定总抢 focus |
| 生命周期 | show/hide 频繁 | 长期存在 |
| 尺寸 | 固定或半固定 | 可调整 |
| Space | 当前 Space / 全屏上方 | 倾向所有 Space |
| 关闭 | hide | close/hide 取决于 Sticky 状态 |

### 13.5 macOS Activation Policy

Helper 可以采用更像系统组件的行为：

```txt
不作为普通 Dock App 出现
通过 Tray / MenuBar / Core 控制生命周期
```

但需要验证：

- 是否影响输入焦点。
- 是否影响 showAndMakeKey。
- 是否影响全屏 App 上显示。
- 是否影响 Cmd+Tab。

### 13.6 macOS 多 Space 与全屏验证项

必须真机验证：

- 普通桌面唤起 Quick。
- 全屏 Safari 上唤起 Quick。
- 全屏 VS Code 上唤起 Quick。
- 多 Space 切换后 Sticky 是否保持。
- Stage Manager 打开时行为。
- 外接显示器上全屏 App 行为。
- 输入法候选框是否正确显示。
- Quick hide on blur 是否过于敏感。
- Sticky 是否挡住系统级 UI。

### 13.7 macOS 风险

| 风险 | 处理 |
|---|---|
| NSPanel 全屏行为不稳定 | 做真机测试矩阵 |
| 输入法候选框异常 | 降低窗口层级或调整 focus 行为 |
| Stage Manager 表现异常 | 单独适配或降级 |
| 多显示器 Space 行为复杂 | 保存 monitor + fallback |
| Helper 无 Dock 后调试困难 | 开发模式保留 debug 行为 |

---

## 14. Windows 窗口方案

### 14.1 基本原则

Windows 不需要模拟 NSPanel。

策略：

```txt
Quick / Sticky 使用 Tauri WebviewWindow
配合 alwaysOnTop / skipTaskbar / decorations false / focus 控制
```

### 14.2 Quick Window

推荐配置：

```txt
Quick Window
├─ decorations: false
├─ resizable: false
├─ alwaysOnTop: true
├─ skipTaskbar: true
├─ focus: true
├─ hide instead of close
└─ multi-monitor aware
```

### 14.3 Sticky Window

推荐配置：

```txt
Sticky Window
├─ decorations: false 或 custom decorations
├─ resizable: true
├─ alwaysOnTop: 可选
├─ skipTaskbar: true
├─ remember position
├─ remember monitor
└─ DPI aware
```

### 14.4 Windows 需要重点处理的问题

- DPI scaling。
- 多屏坐标。
- 锁屏 / 唤醒。
- 显示器插拔。
- 快捷键冲突。
- Alt-Tab 行为。
- 任务栏行为。
- Named Pipe 权限。

### 14.5 Windows 风险

| 风险 | 处理 |
|---|---|
| 多屏缩放导致窗口位置偏移 | 使用 DPI-aware 坐标转换 |
| 锁屏后窗口状态异常 | 监听恢复并重新定位 |
| 快捷键被占用 | 设置页提示并允许修改 |
| Named Pipe 被其他进程误连 | pipe 名包含用户维度并做握手校验 |

---

## 15. 多屏与窗口定位

### 15.1 定位原则

Quick Window 显示位置优先级：

```txt
1. 鼠标所在屏幕
2. 当前焦点窗口所在屏幕
3. 上一次 Quick Window 出现的屏幕
4. 主屏幕
```

Sticky Window 恢复位置优先级：

```txt
1. 上次绑定的 monitor 仍存在 → 恢复原位置
2. monitor 不存在 → 迁移到主屏幕
3. 恢复后窗口超出屏幕 → clamp 到可见区域
```

### 15.2 Quick Window 位置

推荐：

```txt
x = monitor.x + (monitor.width - window.width) / 2
y = monitor.y + monitor.height * 0.18
```

不要放在绝对正中。命令框更适合屏幕上方 18% - 28% 区域。

### 15.3 Sticky Window 位置保存

Sticky 位置建议保存：

```ts
type StickyWindowPlacement = {
  stickyId: string;
  monitorId?: string;
  logicalX: number;
  logicalY: number;
  logicalWidth: number;
  logicalHeight: number;
  scaleFactor?: number;
  updatedAt: string;
};
```

### 15.4 防止窗口跑出屏幕

恢复窗口时必须 clamp：

```txt
if window.x < monitor.x → window.x = monitor.x + margin
if window.y < monitor.y → window.y = monitor.y + margin
if window.right > monitor.right → window.x = monitor.right - width - margin
if window.bottom > monitor.bottom → window.y = monitor.bottom - height - margin
```

---

## 16. Tray 方案

### 16.1 Tray 归属

Tray 由 Helper Shell 管理。

原因：

- Tray 是系统入口，不是主业务窗口。
- Tray 生命周期应和快捷键、Quick、Sticky 一起归 Helper。
- Main Window 关闭后 Tray 仍应可用。

### 16.2 Tray 菜单建议

```txt
Open StoneFlow
Quick Command
New Sticky
Pause Shortcuts
Settings
Restart Helper
Quit StoneFlow
```

### 16.3 Tray 动作流

示例：Open StoneFlow

```txt
用户点击 Tray → Open StoneFlow
  ↓
Helper 发送 app.showMainWindow
  ↓
Core 显示 Main Window
```

示例：Quit StoneFlow

```txt
用户点击 Tray → Quit StoneFlow
  ↓
Helper 发送 app.quitAll
  ↓
Core 接管完整退出流程
```

Helper 不应该自己直接退出整个系统。

---

## 17. Global Shortcut 方案

### 17.1 快捷键归属

全局快捷键只由 Helper 注册。

不允许：

```txt
Main Core 和 Helper 同时注册同一个快捷键
```

原因：

- 避免冲突。
- 避免重复触发。
- 生命周期清晰。
- 设置页只需要关注 Helper 状态。

### 17.2 默认快捷键建议

后续可调整，技术上预留：

| 动作 | 默认快捷键建议 |
|---|---|
| 打开 Quick Command | Cmd/Ctrl + Shift + Space |
| 新建 Sticky | Cmd/Ctrl + Shift + N |
| 显示 / 隐藏 Main Window | Cmd/Ctrl + Shift + S |
| 捕获选中文本 | 后续讨论 |

### 17.3 快捷键冲突处理

注册失败时：

```txt
Helper 记录失败
  ↓
Helper 通知 Core shortcut.registrationFailed
  ↓
Core 保存状态
  ↓
Main Window 设置页展示冲突
  ↓
用户修改快捷键
  ↓
Core 通知 Helper 重新注册
```

### 17.4 暂停快捷键

Tray 应支持：

```txt
Pause Shortcuts
Resume Shortcuts
```

暂停后：

- Helper 注销全局快捷键。
- Tray 仍保留。
- Main Window 仍可打开。
- 设置页显示当前快捷键暂停状态。

---

## 18. 单实例方案

### 18.1 Core 单实例

Core 必须单实例。

第二次启动 StoneFlow 时：

```txt
新 Core 进程启动
  ↓
single-instance 检测已有 Core
  ↓
把启动参数转发给已有 Core
  ↓
新进程退出
  ↓
已有 Core 根据参数显示 Main Window 或执行动作
```

### 18.2 Helper 单实例

Helper 必须单实例。

原因：

- 避免重复 Tray。
- 避免重复注册快捷键。
- 避免重复创建 Quick / Sticky。

第二个 Helper 启动时：

```txt
检测已有 Helper
  ↓
如果已有 Helper 正常 → 新 Helper 退出
  ↓
如果旧 Helper 异常 → 由 Core Supervisor 处理
```

### 18.3 Core / Helper 对应关系

```txt
一个 Core 对应一个 Helper
```

不要支持多个 Helper 连接同一个 Core，除非未来有明确需求。

---

## 19. 数据访问与状态同步

### 19.1 数据真源

```txt
Main Core / SQLite
```

Core 负责：

- Task。
- Project。
- Space。
- View。
- Sticky。
- Settings。
- Command registry。

### 19.2 Helper Runtime State

Helper 只保存运行态：

- IPC connected。
- shortcut registered。
- tray ready。
- quick visible。
- sticky window instances。
- monitor placement cache。

### 19.3 状态同步方式

```txt
Helper 请求 Core 获取初始状态
  ↓
Core 返回 snapshot
  ↓
Helper 订阅 event stream
  ↓
Core 广播增量事件
  ↓
Helper 更新 UI runtime state
```

### 19.4 Event Snapshot 策略

Quick Window 通常不需要长期订阅全部业务事件。

Sticky Window 需要订阅：

- sticky.updated。
- sticky.closed。
- settings.changed。
- core.shuttingDown。

Main Window 需要更完整事件。

### 19.5 是否需要 Helper Pending Outbox

当前 Core-first 方案下，默认不启用 Helper Pending Outbox。

原因：

- Core 未 ready 时 Helper 不启动。
- Helper 不应该在 Core 不可用时接受业务写入。

但可以保留未来扩展点：

```txt
如果未来需要 Helper 在 Core 短暂不可用时缓存输入，再引入短期 Pending Outbox。
```

目前不做，保持 KISS。

---

## 20. 错误处理与降级

### 20.1 Core 启动失败

场景：

- SQLite 打开失败。
- migration 失败。
- 配置损坏。
- IPC Server 启动失败。

处理：

```txt
不启动 Helper
显示错误窗口
记录日志
提供重试 / 打开日志 / 退出
```

### 20.2 Helper 启动失败

处理：

```txt
Core 记录错误
进入 HelperDegraded
Main Window 设置页展示 Helper 不可用
允许用户手动 Retry Helper
```

### 20.3 IPC 断开

Helper 处理：

```txt
进入 Disconnected
隐藏 Quick Window
Sticky 进入只读错误态或隐藏
尝试有限重连
失败后退出
```

Core 处理：

```txt
检测 Helper 连接断开
结合进程状态判断是否重启
```

### 20.4 快捷键注册失败

处理：

```txt
Helper 不崩溃
Tray 仍可用
Core 记录 shortcut conflict
设置页提示用户修改
```

### 20.5 Sticky 恢复失败

处理：

```txt
单个 Sticky 恢复失败不影响 Helper 整体
记录 stickyId 和原因
主窗口可提示部分 Sticky 未恢复
```

---

## 21. 打包、签名与发布

### 21.1 macOS 打包结构

目标结构：

```txt
StoneFlow.app
├─ Contents/
│  ├─ MacOS/
│  │  └─ stoneflow-main
│  ├─ Resources/
│  │  └─ StoneFlow Helper.app
│  │     └─ Contents/
│  │        └─ MacOS/
│  │           └─ stoneflow-helper
│  └─ Info.plist
```

可根据 Tauri 打包能力和签名要求调整，但原则是：

```txt
Main Core 和 Helper 同包发布
```

### 21.2 Windows 打包结构

目标结构：

```txt
StoneFlow/
├─ StoneFlow.exe
├─ StoneFlow.Helper.exe
└─ resources/
```

### 21.3 版本绑定

Main Core 和 Helper 必须同版本发布。

不支持：

```txt
Main Core v1.5 + Helper v1.3
```

启动和握手时都需要校验。

### 21.4 更新策略

原则：

- Core 和 Helper 一起更新。
- schema migration 只由 Core 执行。
- Helper 不单独升级。
- 协议不兼容时阻止 Helper ready。

更新流程：

```txt
Core 检查更新
  ↓
下载完整包
  ↓
退出 Helper
  ↓
退出 Core
  ↓
安装更新
  ↓
新 Core 启动
  ↓
新 Core 启动新 Helper
```

---

## 22. 工程目录设计

> 修订说明：
> - 本章节里的 `apps/main-core`、`stoneflow-domain`、`packages/quick-ui` 等目录，是偏未来态的概念演进参考；
> - 当前仓库真实落地必须遵守 `src-tauri/ARCHITECTURE.md`，不新增新的顶层 crate；
> - Quick Create 本轮实现继续收敛在既有 `desktop-app / helper-app / ipc-protocol` 内部分层完成。

### 22.1 Monorepo 结构

```txt
stoneflow/
├─ apps/
│  ├─ main-core/
│  └─ helper-shell/
│
├─ crates/
│  ├─ stoneflow-domain/
│  ├─ stoneflow-protocol/
│  ├─ stoneflow-ipc/
│  ├─ stoneflow-window/
│  ├─ stoneflow-platform/
│  └─ stoneflow-shared/
│
├─ packages/
│  ├─ ui/
│  ├─ quick-ui/
│  ├─ sticky-ui/
│  └─ shared-types/
│
└─ docs/
   └─ independent-window-tech-plan.md
```

### 22.2 crates 说明

#### stoneflow-domain

职责：

- Task 领域模型。
- Project 领域模型。
- Space 领域模型。
- Sticky 领域模型。
- 领域规则。

不依赖：

- Tauri。
- WebView。
- IPC。
- SQLite 具体实现。

#### stoneflow-protocol

职责：

- RPC 类型。
- Handshake 类型。
- Event 类型。
- Error 类型。
- Capabilities。
- 协议版本常量。

#### stoneflow-ipc

职责：

- UDS transport。
- Named Pipe transport。
- framing。
- client。
- server。
- reconnect。
- request router。

#### stoneflow-window

职责：

- 平台无关窗口接口。
- QuickWindow trait。
- StickyWindow trait。
- WindowPlacement。
- Monitor abstraction。

#### stoneflow-platform

职责：

- macOS 平台能力封装。
- Windows 平台能力封装。
- NSPanel adapter。
- Topmost Window adapter。

### 22.3 packages 说明

#### packages/ui

通用基础 UI：

- Button。
- Input。
- Card。
- Token。
- Icon。
- Typography。

#### packages/quick-ui

Quick Window 独立 UI。

#### packages/sticky-ui

Sticky Window 独立 UI。

#### packages/shared-types

前端共享类型，尽量由 protocol 生成或手动保持一致。

---

## 23. 开发落地路线

### P0：架构骨架

目标：在现有仓库内完成 Quick Create 主链收口，而不是新开一套顶层工程。

任务：

- 统一 `Quick Create` 命名，停止新增 `quick-capture` 语义。
- 以 `stoneflow_quick_create_v6.html` 作为唯一 UI 参考。
- 明确 `desktop-app` 负责 Core，`helper-app` 负责独立浮窗壳，`ipc-protocol` 负责纯 DTO。
- 清理旧 route / 旧 invoke / 旧协议的长期双轨预期。

验收：

```txt
Quick Create 成为唯一全局快捷创建语义
不再以未来态目录结构作为当前开发前提
```

### P1：Core Ready 链路

目标：让现有 Core 真正接管 Helper 生命周期。

任务：

- `desktop-app` 启动后完成 single-instance 校验。
- 数据库/bootstrap 完成后启动 IPC server，进入 `CoreIpcReady`。
- Core 定位并拉起 helper binary。
- 建立 helper `starting -> ready / disconnected / crashed / restarting / shutting_down` 真实状态流转。
- Core 退出时负责 helper shutdown，不让 helper 残留。

验收：

```txt
Core 能明确进入 CoreProcessReady / CoreDataReady / CoreIpcReady
Core 未 ready 时不会启动 Helper
Core 退出时会先收敛 Helper 生命周期
```

### P2：Helper Supervisor

目标：Core 能启动和监督 Helper。

任务：

- locate helper binary。
- start helper。
- observe exit。
- backoff restart。
- intentional exit 标记。
- Helper 状态暴露。

验收：

```txt
Core 启动后自动启动 Helper
手动杀掉 Helper 后 Core 自动重启
Quit StoneFlow 时 Helper 不被误重启
```

### P3：IPC 打通

目标：Core 和 Helper 完成稳定通信。

任务：

- UDS。
- Named Pipe。
- length-prefixed JSON。
- handshake。
- ping。
- request / response。
- event stream。
- error 类型。

验收：

```txt
Helper 能连接 Core
握手失败会被拒绝
ping 正常
Core 能广播事件给 Helper
```

### P4：Tray + Global Shortcut

目标：系统入口可用。

任务：

- Helper 注册快捷键。
- 快捷键冲突处理。
- Tray 创建。
- Tray 菜单。
- app.showMainWindow。
- app.quitAll。

验收：

```txt
快捷键能触发动作
Tray 能打开主窗口
Tray Quit 能完整退出 Core 和 Helper
```

### P5：Quick Window 基础能力

目标：命令框基础窗口可用。

任务：

- Quick Window 懒创建。
- show / hide。
- focus。
- 独立 quick-ui。
- quick.getInitialState。
- command.search 占位。
- command.execute 占位。

验收：

```txt
按快捷键打开 Quick Window
输入 query 能请求 Core
Esc / blur 可隐藏
下次打开复用窗口
```

### P6：macOS NSPanel

目标：macOS Quick / Sticky 使用 NSPanel。

任务：

- 接入 tauri-nspanel。
- Quick Panel。
- Sticky Panel。
- panel level。
- canBecomeKeyWindow。
- all spaces / fullscreen behavior。
- 多屏测试。

验收：

```txt
Quick 能在普通桌面和全屏 App 上唤起
Sticky 能跨 Space / 全屏 App 显示
输入法基本正常
```

### P7：Windows Floating Window

目标：Windows 独立窗口可用。

任务：

- Topmost WebviewWindow。
- skipTaskbar。
- decorations false。
- DPI aware placement。
- 多屏测试。

验收：

```txt
Quick / Sticky 在 Windows 多屏下表现稳定
位置恢复正常
```

### P8：Sticky 完整能力

目标：Sticky 可真实使用。

任务：

- sticky.create。
- sticky.update。
- sticky.restore。
- sticky.close。
- 窗口位置保存。
- Pin / Unpin。
- Collapse / Expand。

验收：

```txt
Sticky 可创建、编辑、关闭、恢复
Core 是数据真源
Helper 是窗口 owner
```

### P9：稳定性与测试

目标：进入可长期使用状态。

任务：

- crash recovery。
- IPC reconnect。
- event seq 检查。
- 快捷键冲突。
- 打包路径。
- 更新流程。
- macOS 签名验证。
- Windows 安装包验证。

验收：

```txt
常见异常场景不会导致数据损坏
Helper 崩溃可恢复
Core 退出流程干净
```

---

## 24. 测试清单

### 24.1 生命周期测试

- Core 正常启动。
- Core 数据库打开失败。
- Core migration 失败。
- Helper 正常启动。
- Helper 启动失败。
- Helper 崩溃后重启。
- Helper 被用户 kill 后重启。
- Core 退出时 Helper 退出。
- 关闭 Main Window 后 Core 继续运行。
- 第二次启动 App 显示已有窗口。

### 24.2 IPC 测试

- handshake 成功。
- app 不匹配。
- role 不匹配。
- protocolVersion 不匹配。
- schemaVersion 不匹配。
- ping 超时。
- request 超时。
- event seq 连续。
- Core 重启后 Helper 识别 coreBootId 改变。
- Helper 重启后 Core 识别 helperBootId 改变。

### 24.3 Quick Window 测试

- 首次打开。
- 后续复用打开。
- Esc 关闭。
- blur 关闭。
- 搜索 loading。
- 搜索空状态。
- command.execute 成功。
- command.execute 失败。
- Core busy 时提示。
- 快捷键冲突时不可用提示。

### 24.4 Sticky 测试

- 创建 Sticky。
- 编辑 Sticky。
- 关闭 Sticky。
- 恢复 Sticky。
- Pin / Unpin。
- Collapse / Expand。
- 多屏位置恢复。
- 显示器拔掉后 fallback。
- Core 更新 Sticky 后 Helper 同步。

### 24.5 macOS 测试

- 普通桌面唤起 Quick。
- 全屏 App 上唤起 Quick。
- 多 Space 切换。
- Stage Manager。
- 外接显示器。
- 输入法候选框。
- Cmd+Tab 行为。
- Dock 行为。
- Mission Control 行为。
- 睡眠唤醒。

### 24.6 Windows 测试

- 单屏。
- 多屏。
- 不同 DPI scaling。
- 锁屏唤醒。
- 任务栏行为。
- Alt-Tab 行为。
- 快捷键冲突。
- Named Pipe 连接权限。
- 显示器插拔。

---

## 25. 日志与可观测性

### 25.1 日志原则

Core 和 Helper 都必须有独立日志。

日志必须包含：

- appVersion。
- protocolVersion。
- coreBootId。
- helperBootId。
- process id。
- platform。
- lifecycle state。

### 25.2 关键日志点

Core：

- CoreProcessReady。
- CoreDataReady。
- CoreIpcReady。
- Helper start。
- Helper ready。
- Helper crash。
- Helper restart。
- Core shutdown。

Helper：

- Helper start。
- IPC connect。
- handshake result。
- shortcut register result。
- tray created。
- quick show / hide。
- sticky create / restore。
- IPC disconnected。
- Helper shutdown。

### 25.3 Debug 面板

Main Window 设置页建议增加开发/诊断区域：

```txt
Core Status
Helper Status
IPC Status
Shortcut Status
Tray Status
Quick Window Status
Sticky Window Count
Last Helper Error
Open Logs
Restart Helper
```

这对双进程架构非常重要。

---

## 26. 安全与权限

### 26.1 IPC 安全

必须做：

- pipe / socket 路径带用户维度。
- handshake 校验 app。
- handshake 校验 role。
- handshake 校验版本。
- 不接受未知 method。
- 不暴露 HTTP 端口。

### 26.2 数据权限

Helper 不持有数据库路径，不打开 SQLite。

### 26.3 命令执行安全

Command 系统必须通过 Core registry 执行。

不允许 Helper 拼接任意 command 直接执行系统命令。

---

## 27. 最终决策记录

| 决策 | 结果 |
|---|---|
| 进程模型 | Core-first 双 Tauri App |
| 启动入口 | Main Core |
| Helper 启动 | CoreIpcReady 后由 Core 启动 |
| Helper 崩溃 | Core 自动重启 |
| Core 未 ready | Helper 不启动 |
| Core 崩溃 | Helper 进入 degraded 后退出，不反向启动 Core |
| 数据真源 | Main Core / SQLite |
| Helper 访问 SQLite | 不允许 |
| IPC | macOS UDS，Windows Named Pipe |
| IPC 协议 | JSON-RPC-like + event stream |
| Framing | length-prefixed JSON |
| Quick Window | 命令框优先，懒创建并复用 |
| Sticky Window | 像系统贴纸一样跨 Space / 全屏 App |
| macOS 窗口 | tauri-nspanel / NSPanel |
| Windows 窗口 | Topmost WebviewWindow |
| Tray | Helper 管理 |
| Global Shortcut | Helper 管理 |
| Main Window | Core 内普通业务窗口 |
| 单实例 | Core 和 Helper 都必须单实例 |
| 更新 | Core + Helper 同包同版本升级 |

---

## 28. 当前暂不展开但需要后续讨论的问题

以下问题不阻塞独立窗口技术方案，但会影响后续产品方案：

1. 命令框的具体产品形态。
2. Command Registry 的领域模型。
3. Command Search 的排序策略。
4. Quick Window 的默认交互与快捷键。
5. Sticky 的具体交互：折叠、贴边、透明度、任务绑定。
6. 是否需要 Capture Selected Text。
7. 是否开机自启 Core。
8. macOS 是否提供 MenuBar-only 模式。
9. Helper 是否需要开发模式 Debug Dock 图标。
10. Quick Window 是否支持插件命令。

---

## 29. 最终方案摘要

StoneFlow 的独立窗口方案最终应采用：

```txt
Core-first 双 Tauri App
Main Core 作为数据与领域真源
Helper Shell 作为系统入口与窗口管理层
macOS 使用 NSPanel
Windows 使用 Topmost WebviewWindow
IPC 使用 UDS / Named Pipe + JSON-RPC-like
Quick Window 命令框优先
Sticky Window 跨 Space / 全屏 App
```

这个方案的价值在于：

- 数据边界清晰。
- 生命周期清晰。
- Helper 崩溃可恢复。
- Main Window 和系统入口解耦。
- macOS 全屏 / Space 问题有专门技术落点。
- Windows 不强行模拟 macOS 能力。
- IPC 协议可版本化演进。
- 工程模块化，适合长期维护。

最终原则：

```txt
Core 是 StoneFlow 的操作系统。
Helper 是 StoneFlow 的系统外壳。
Quick / Sticky / Main Window 是不同场景下的 UI 投影。
```
