# StoneFlow Quick Create 全局弹窗系统重构方案

> 版本：v1
> 状态：重构方案定稿
> 适用范围：`/Users/sty/Desktop/StoneFlow-new` 当前 Quick Create 全局弹窗系统
> 目标：重建 Quick Create 的前后端架构、生命周期、状态机、状态流转与模块边界

---

## 0. 一句话结论

当前 Quick Create 的主要问题不是单点 bug，而是：

```txt
窗口生命周期
+ 前端准备流程
+ 布局测量
+ 业务数据获取
+ 搜索与提交
+ 焦点与快捷键
```

这六类职责被混在了同一条链路里，最终导致：

1. 任何一个视觉或时序问题都会反向污染整体架构；
2. 前端和 Helper 各自维护半套隐式状态机；
3. 状态组合过多，无法证明哪些组合是合法的；
4. 每次修一个 bug 都在继续扩大偶然复杂度。

本次推荐方案是：

> 采用 **Core-first + Helper Shell + Session-based Popup Runtime** 的重构方向，把 Quick Create 重建为一套显式状态机驱动的全局弹窗系统。

---

## 1. 当前系统的真实结构

当前链路可概括为：

```txt
Global Shortcut
  -> helper-app platform window
    -> emit quick-create:prepare
      -> frontend provider bootstrap / refresh
        -> layout measure
          -> helper_quick_resize_window
            -> helper_quick_present_window
              -> emit quick-create:presented
                -> input focus
```

业务动作链路则是：

```txt
Quick Create Frontend
  -> helper-app tauri commands
    -> ipc_client
      -> desktop-app ipc server
        -> QuickCreateService
          -> domain services / repositories / database
```

这个方向本身没有错，错误在于边界没有继续收紧。

---

## 2. 当前实现的主要问题

## 2.1 前端 Provider 过载

当前 `QuickCreateProvider` 同时负责：

1. 初始态 bootstrap；
2. reopen 时状态刷新；
3. prepare / presented 事件监听；
4. 搜索 debounce 与竞态处理；
5. 项目列表加载；
6. submit / openResult；
7. close delay；
8. focus 调度；
9. 大量 derived state；
10. 键盘分发。

这意味着：

- Provider 已经不是“状态真相源”，而是“整个 feature runtime”；
- 生命周期变化会直接打断业务状态；
- 业务交互又会反向影响窗口呈现时序。

## 2.2 reducer 不是显式状态机

当前 reducer 里存在：

- `isBootstrapping`
- `isPresentationPending`
- `searchView`
- `isSearching`
- `submitState`
- `focusTarget`
- `activePopover`

这些字段是扁平布尔和枚举混搭，而不是同一条状态机。

结果是：

1. 存在大量理论上不该出现、但类型上完全合法的状态组合；
2. 无法通过类型系统约束流程合法性；
3. prepare / resize / present / close 都只能靠约定，而不是靠状态转移保证。

## 2.3 窗口呈现链路仍然是隐式流程

当前流程虽然已经做了 `prepare -> resize -> present`，但它仍然依赖：

1. helper 发事件；
2. frontend 监听事件；
3. Provider 决定 dispatch；
4. WindowShell 观察布尔值；
5. layout hook 完成测量；
6. resize promise resolve；
7. 再次由 effect 调用 `presentWindow()`。

这个链条的问题不是“步骤多”，而是：

- 没有 session id；
- 没有一次打开对应的一次完整事务；
- 旧请求和新请求的边界不清楚；
- race condition 只能靠 requestId/ref 局部补丁修。

## 2.4 Helper runtime 边界过粗

当前 `helper-app/src/commands.rs` 同时承担：

1. 业务查询命令；
2. 创建 / 打开命令；
3. 窗口 resize；
4. diagnostics；
5. present；
6. frontend ready/unready。

这违反了单一职责。

更重要的是，当前 Helper 仍然只有一个过薄的 `QuickCreateFrontendState { listener_ready }`。

这不足以表达：

1. 当前是否存在进行中的打开会话；
2. 当前窗口是否处于 preparing / measuring / presenting / visible；
3. 当前 resize / present 是否属于同一轮会话；
4. 前端是否处于可接收 prepare 的稳定状态。

## 2.5 平台窗口适配和产品状态没有彻底分层

当前 macOS `NSPanel` 和 Windows `WebviewWindow` 虽然已经分文件，但上层仍旧让产品流程感知平台细节：

- Windows 需要重新定位；
- macOS 需要 preserving top；
- CSS px 与 native logical px 转换在 command 层处理；
- present 前后事件语义仍然是产品层和窗口层混杂。

这说明“平台窗口控制器”还没有成为独立边界。

## 2.6 IPC 粒度偏细，导致前端要自己拼流程

当前前端需要多次调用：

1. `getInitialState`
2. `listProjectsBySpace`
3. `search`
4. `create`
5. `openTarget`
6. `resizeWindow`
7. `presentWindow`

问题不是接口数量多，而是：

- 会话初始化没有聚合；
- 前端要自己决定什么时候 refresh、什么时候 reuse cache；
- 前端不得不成为流程 orchestrator。

这会继续拉高前端 runtime 复杂度。

---

## 3. 重构目标

本次重构要达成的不是“再修几个 bug”，而是固定以下长期边界：

1. Core 仍然是唯一业务真相源；
2. Helper 只负责系统入口、窗口生命周期与会话控制；
3. 前端只负责 UI、用户输入与布局测量；
4. 窗口生命周期改为显式状态机；
5. 每一次唤起都有明确 session；
6. 所有异步步骤都能判断是否属于当前 session；
7. 业务状态与窗口状态彻底拆开；
8. 前端 Provider 回到“组合 domain state”的职责，不再承包整条 runtime。

---

## 4. 第一性原则

## 4.1 单一真相源

```txt
业务数据真相源：desktop-app / Core
窗口生命周期真相源：helper-app / Session Runtime
界面布局真相源：frontend measured layout
```

三者必须分开。

## 4.2 单向依赖

```txt
Core owns business
Helper owns popup runtime
Frontend owns rendering

Frontend -> Helper -> Core
Core never depends on Frontend
Helper never owns business
```

## 4.3 一次唤起就是一次会话

Quick Create 不是“一个常驻页面 + 多个副作用”，而是：

> 用户每次按下快捷键，都会开启一轮新的 popup session。

这个 session 应该有明确：

1. `sessionId`
2. `openedAt`
3. `reason`
4. `phase`
5. `windowSpec`
6. `openContext`

## 4.4 不允许隐式 fallback 绕过主流程

像“前端没 ready 就直接 show”这种 fallback，在调试期可接受，在正式架构里必须删除。

原因很简单：

- 只要还存在绕过正式状态机的路径，正式状态机就不是真正的真相源。

## 4.5 前端不负责平台窗口治理

前端可以上报：

- 内容高度
- 是否布局稳定
- 需要 focus 的目标

前端不应该负责：

- 窗口 show/hide 策略
- 多屏定位
- top anchor 保持
- native px / logical px 换算决策

---

## 5. 推荐架构

## 5.1 总体结构

```txt
desktop-app
├── app/
│   ├── supervisor/             # helper lifecycle owner
│   ├── helper_runtime/         # ipc server + helper bridge
│   └── commands/
├── application/
│   └── services/
│       └── quick_create_service.rs

helper-app
├── runtime/
│   ├── session.rs              # popup session state machine
│   ├── frontend_runtime.rs     # frontend readiness / boot snapshot
│   └── mod.rs
├── window_controller/
│   ├── mod.rs
│   ├── macos.rs
│   └── windows.rs
├── commands/
│   ├── domain.rs
│   ├── window.rs
│   ├── diagnostics.rs
│   └── mod.rs
├── shortcut.rs
└── ipc_client.rs

frontend quick-create
├── runtime/
│   ├── QuickCreateSessionProvider.tsx
│   ├── quickCreateSessionReducer.ts
│   ├── QuickCreateKeyboardController.tsx
│   └── types.ts
├── domain/
│   ├── QuickCreateDomainProvider.tsx
│   ├── quickCreateDomainReducer.ts
│   └── selectors.ts
├── layout/
│   ├── QuickCreateLayoutPresenter.tsx
│   ├── measureQuickCreateLayout.ts
│   └── useQuickCreateLayout.ts
├── ui/
└── api/
```

---

## 5.2 Core 层职责

Core 继续负责：

1. 当前 active scope；
2. Quick Create open context；
3. 搜索；
4. 创建；
5. 打开目标；
6. 事件广播；
7. helper supervisor；
8. helper 状态暴露。

Core 不负责：

1. popup visible / hidden；
2. native window geometry；
3. prepare / present；
4. frontend ready。

## 5.3 Helper 层职责

Helper 只负责：

1. 全局快捷键；
2. popup session 管理；
3. 平台窗口 show / hide / resize / focus；
4. 会话与前端之间的时序对齐；
5. 调用 Core 获取业务数据。

Helper 不负责：

1. 数据库存取；
2. 默认业务规则计算；
3. 草稿长期保存；
4. 搜索 UI 决策；
5. 领域错误恢复策略。

## 5.4 Frontend 层职责

Frontend 只负责：

1. 渲染 Quick Create UI；
2. 维护用户本轮编辑态；
3. 上报布局测量结果；
4. 响应 session phase；
5. 响应业务数据更新；
6. 键盘交互。

Frontend 不负责：

1. 决定窗口何时真正 show；
2. 平台窗口定位；
3. 是否保留旧 session；
4. 跨进程几何换算策略。

---

## 6. 新的状态机设计

## 6.1 Helper Popup Session State Machine

推荐定义：

```txt
Idle
  -> Preparing(session)
  -> WaitingFrontend(session)
  -> WaitingLayout(session)
  -> Presenting(session)
  -> Visible(session)
  -> Closing(session)
  -> Idle

Error(session)
  -> Idle
```

### 状态说明

| 状态 | 含义 |
|------|------|
| `Idle` | 没有打开中的 popup session |
| `Preparing` | 快捷键触发后，Helper 已创建新 session，正在通知前端准备 |
| `WaitingFrontend` | 前端已收到 prepare，但尚未回传可用布局 |
| `WaitingLayout` | 会话数据已就绪，等待首轮稳定测量结果 |
| `Presenting` | Helper 正在应用 geometry 并调用平台 show/focus |
| `Visible` | 当前 session 已进入可见状态 |
| `Closing` | 正在关闭当前 session |
| `Error` | 当前 session 失败，等待清理 |

## 6.2 Frontend Session State Machine

前端只维护 popup 会话状态：

```txt
booting
  -> hidden
  -> preparing(sessionId)
  -> measuring(sessionId)
  -> readyToPresent(sessionId)
  -> visible(sessionId)
  -> closing(sessionId)
  -> hidden
```

前端不再通过布尔组合表达 session phase。

## 6.3 Frontend Domain State Machine

业务编辑态单独维护：

```txt
idleDraft
editingDraft
submitting
submitSuccess
submitError
```

搜索单独维护：

```txt
recent
searching
results
empty
error
```

项目选择单独维护：

```txt
ready
loadingProjects
projectsReady
projectsError
```

这三条状态流彼此独立，不再混成一条 reducer。

---

## 7. 推荐的数据与接口模型

## 7.1 新增 Open Session Context

推荐 Core -> Helper / Frontend 的聚合载荷：

```ts
type QuickCreateOpenContext = {
  sessionId: string
  currentScope: QuickCreateScope
  defaultSpaceId: string
  defaultPlacement: QuickCreatePlacement
  spaces: QuickCreateSpaceSummary[]
  projectOptions: QuickCreateProjectOption[]
  recentTasks: QuickCreateTaskItem[]
  recentProjects: QuickCreateProjectItem[]
  openedAt: string
}
```

这样做的目的：

1. 一次 prepare 拿到完整 open context；
2. 前端不再自己决定 bootstrap 和 reopen refresh 的拼接方式；
3. session 与数据上下文天然绑定。

## 7.2 Helper Window Commands

推荐窗口命令改成：

1. `helper_quick_prepare_session() -> QuickCreateOpenContext`
2. `helper_quick_commit_layout(input: { sessionId, panelHeightCssPx, dpr })`
3. `helper_quick_present_session(input: { sessionId })`
4. `helper_quick_close_session(input: { sessionId, reason })`
5. `helper_quick_frontend_ready()`
6. `helper_quick_frontend_unready()`

当前 `resizeWindow + presentWindow` 的两步 API 保留思路，但语义升级成会话级别。

## 7.3 Domain Commands

业务命令单独保留：

1. `helper_quick_search`
2. `helper_quick_create`
3. `helper_quick_create_and_open`
4. `helper_quick_open_target`
5. `helper_quick_list_projects_by_space`

但这些命令不再参与窗口生命周期。

## 7.4 Session-bound Event Model

所有事件推荐带 `sessionId`：

1. `quick-create:prepare`
2. `quick-create:presented`
3. `quick-create:close-requested`
4. `quick-create:session-invalidated`

任何没有 `sessionId` 的异步结果都不应该被接受。

---

## 8. 前端模块重构方案

## 8.1 当前目录的问题

当前 `features/quick-create` 目录下：

- `model/` 实际承包了 runtime；
- `layout/` 与 window show/present 耦合；
- `shell/` 只是一层调度壳，但承担了关键时序；
- UI 虽然已拆分，但依赖的状态面仍然过大。

## 8.2 推荐目录

```txt
src/features/quick-create/
├── ARCHITECTURE.md
├── api/
│   ├── quickCreateDomain.ts
│   └── quickCreateSession.ts
├── runtime/
│   ├── QuickCreateSessionProvider.tsx
│   ├── quickCreateSessionReducer.ts
│   ├── quickCreateSessionTypes.ts
│   └── QuickCreateKeyboardController.tsx
├── domain/
│   ├── QuickCreateDomainProvider.tsx
│   ├── quickCreateDomainReducer.ts
│   ├── quickCreateSelectors.ts
│   └── types.ts
├── layout/
│   ├── QuickCreateLayoutPresenter.tsx
│   ├── measureQuickCreateLayout.ts
│   └── useQuickCreateLayout.ts
├── shell/
│   └── QuickCreateRuntimeShell.tsx
└── ui/
    ├── QuickCreatePage.tsx
    ├── QuickCreateFrame.tsx
    ├── QuickCreateSurface.tsx
    ├── QuickCreateComposer.tsx
    ├── QuickCreateBoardRegion.tsx
    └── ...
```

## 8.3 新的 Provider 分工

### `QuickCreateSessionProvider`

职责：

1. 接收 prepare / presented / close-requested 事件；
2. 拉取 `openContext`；
3. 驱动 popup phase；
4. 维护 `sessionId`；
5. 拒绝旧 session 结果。

### `QuickCreateDomainProvider`

职责：

1. 管理草稿；
2. 管理搜索；
3. 管理项目选项；
4. 管理 submit/open result；
5. 管理 toast / feedback。

### `QuickCreateLayoutPresenter`

职责：

1. 监听 session phase；
2. 在 `preparing/measuring` 阶段完成测量；
3. 上报 `commitLayout(sessionId, height)`；
4. 在 Helper 确认后推动 `presentSession(sessionId)`。

### `QuickCreateKeyboardController`

职责：

1. Escape；
2. ArrowUp/ArrowDown；
3. Enter / Meta+Enter / Shift+Enter；
4. 焦点切换。

它不再直接持有业务状态，只消费 session/domain 的对外接口。

## 8.4 组合模式要求

参考 React composition 最佳实践，Quick Create 前端后续必须遵守：

1. 不再新增 `isXxx` 布尔 prop 控制大模式；
2. `Frame / Surface / Composer / Board / Footer` 继续保持组合式 API；
3. Provider 是状态边界，不是 UI 巨型控制器；
4. 视图组件只消费最小必要 selector；
5. 键盘逻辑、会话逻辑、业务逻辑、布局逻辑必须物理分文件。

---

## 9. Helper 与 Core 的 Rust 重构方案

## 9.1 helper-app 目录重组

推荐：

```txt
src-tauri/crates/helper-app/src/
├── commands/
│   ├── mod.rs
│   ├── domain.rs
│   ├── window.rs
│   └── diagnostics.rs
├── runtime/
│   ├── mod.rs
│   ├── session.rs
│   └── frontend_runtime.rs
├── window_controller/
│   ├── mod.rs
│   ├── macos.rs
│   └── windows.rs
├── ipc_client.rs
├── shortcut.rs
├── window_spec.rs
└── lib.rs
```

## 9.2 `session.rs` 设计

建议在 Helper 内建立显式 runtime：

```rust
pub struct QuickPopupSessionState {
    phase: QuickPopupPhase,
    current_session: Option<QuickPopupSession>,
}

pub enum QuickPopupPhase {
    Idle,
    Preparing,
    WaitingFrontend,
    WaitingLayout,
    Presenting,
    Visible,
    Closing,
    Error,
}

pub struct QuickPopupSession {
    session_id: String,
    opened_at: OffsetDateTime,
    reason: QuickPopupOpenReason,
    open_context: Option<QuickInitialStatePayload>,
}
```

这样 Helper 才真正拥有“popup runtime”。

## 9.3 `window_controller` 设计

统一 trait：

```rust
pub trait QuickPopupWindowController {
    fn prepare_hidden(&self) -> Result<(), WindowControllerError>;
    fn apply_layout(&self, layout: QuickPopupLayout) -> Result<(), WindowControllerError>;
    fn present(&self) -> Result<(), WindowControllerError>;
    fn hide(&self) -> Result<(), WindowControllerError>;
    fn is_visible(&self) -> Result<bool, WindowControllerError>;
}
```

平台差异全部收口到 controller 内部：

1. macOS：
   - NSPanel
   - top anchor preserve
   - active screen placement

2. Windows：
   - WebviewWindow
   - monitor center
   - zoom reset

业务层不再知道这些差异。

## 9.4 desktop-app 侧保持最小改动方向

Core 侧原则上不需要推翻当前 `QuickCreateService`，因为它的业务边界相对健康。

但建议新增：

1. `QuickCreateOpenContextService`
2. `QuickCreateSessionBridge`

目的：

- 把 `get_initial_state` 升级成 prepare-session 所需的聚合上下文；
- 保持 `QuickCreateService` 继续只做业务编排；
- 避免把 popup lifecycle 逻辑塞回 service。

---

## 10. 推荐的迁移步骤

## 10.1 Phase 1：先定运行时边界

目标：

1. 在 Helper 建立 `session.rs`；
2. 拆 `commands.rs`；
3. 引入 `window_controller`；
4. 保持旧前端暂时可用。

验收：

- Helper 已拥有显式 popup session runtime；
- `commands.rs` 不再是全能文件；
- platform window 操作已独立。

## 10.2 Phase 2：重建前端 session runtime

目标：

1. 拆 `QuickCreateProvider`；
2. 建立 `SessionProvider + DomainProvider + LayoutPresenter`；
3. 旧 reducer 停止承载窗口生命周期。

验收：

- prepare/present 链路已由 session phase 驱动；
- `layoutVersion` 之类的间接 invalidation 可以删除；
- 旧的隐式 effect 串被明显缩短。

## 10.3 Phase 3：升级会话级 API

目标：

1. `resizeWindow/presentWindow` 升级成 session-aware API；
2. prepare 返回聚合 open context；
3. 所有 async callback 带 `sessionId`。

验收：

- 连续 reopen 不会接受旧 session 的结果；
- fast toggle 不会触发脏呈现；
- 任何 race 都可通过 session 日志诊断。

## 10.4 Phase 4：清理过时逻辑

删除：

1. fallback direct show；
2. 旧 `bootstrapStarted / panelShownRefreshed / presentationRequested` 组合；
3. 过时 diagnostics 字段；
4. 不再需要的 `requestIdRef` 与时序补丁。

---

## 11. 测试与验证方案

## 11.1 Rust 测试

必须补的测试：

1. session state transition tests
2. window command rejects stale session
3. frontend-ready before/after prepare handling
4. helper toggle while preparing
5. helper toggle while visible
6. session invalidation on close

Rust 最佳实践要求：

1. 纯状态机尽量做无 UI 单元测试；
2. error 使用 `Result`，不要靠 panic；
3. 如果某状态转移不合法，应返回 typed error。

## 11.2 前端测试

必须补的测试：

1. prepare -> measuring -> present 正常流转；
2. stale session result 被丢弃；
3. reopen 不覆盖有编辑内容的 draft；
4. search stale-while-revalidate 保持旧结果；
5. Escape 行为在 popover/title/empty 三种状态下正确；
6. Shift+Enter / Meta+Enter / Enter 三种提交路径正确。

## 11.3 手工验收

必须手验：

1. 首次打开不闪；
2. 连续快速开关不闪；
3. 多屏切换定位正确；
4. main space 切换后 reopen 默认值正确；
5. macOS 上失焦即隐藏；
6. Windows 上尺寸与阴影不抖；
7. 搜索结果、最近项、创建项在不同状态下没有布局跳变。

---

## 12. 风险与取舍

## 12.1 为什么不推荐继续局部修补

继续修补当然也能把当前问题压下去，但代价是：

1. Provider 会继续膨胀；
2. session 概念永远隐含在 ref 和 effect 里；
3. 下一轮需求只会更难接。

这条路已经不值得继续投入。

## 12.2 为什么不推荐上 XState

XState 的优点是显式状态机，但当前仓库并没有建立这类依赖和团队心智。

对本项目来说，更合理的是：

1. Rust 侧：typed enum state machine；
2. TS 侧：discriminated union reducer；
3. 用现有栈完成显式状态流转。

这样更符合 KISS，也更容易落地。

## 12.3 为什么不建议把 Quick Create 与普通 Create Modal 统一

原因不是“永远不能统一”，而是当前阶段统一一定会过早抽象。

两者差异非常明确：

1. 容器语义不同；
2. 生命周期不同；
3. 键盘优先级不同；
4. 结果区与最近项语义不同；
5. 平台窗口问题只属于 Quick Create。

所以本轮只重构 Quick Create。

---

## 13. 最终拍板

Quick Create 全局弹窗系统的正式方向定为：

1. **Core-first 双 Tauri App 架构继续保留**
2. **Helper 负责 popup session runtime**
3. **Frontend 拆为 session / domain / layout 三层**
4. **采用 session-based 显式状态机**
5. **窗口生命周期与业务状态彻底分离**
6. **删除所有绕过正式流程的 fallback show**
7. **以 `sessionId` 作为所有异步步骤的一致性边界**

如果后续要直接实施，建议按以下顺序推进：

1. 先改 `helper-app` runtime 与 commands 分层；
2. 再改前端 session provider；
3. 最后升级 API 契约并清理旧补丁。

这条路线是当前仓库里最稳、最清晰、长期维护成本最低的方案。
