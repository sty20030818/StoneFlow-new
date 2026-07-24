# R8 Runtime 与 Platform - Spec

## 目标

让 Tauri runtime 成为干净 transport/composition 层，并将 Launcher、窗口、快捷键、托盘、更新器和凭证能力限定在 platform/runtime 边界。

## 范围

- 用 application service 重写 Tauri commands、AppState 与 composition。
- 普通 CRUD 使用 command 返回值；同步状态使用有限事件，不用 event 传递实体真相。
- Launcher 保持独立窗口/会话，但调用与主应用相同的 application 用例。
- 接入窗口、tray、快捷键、single-instance、Updater、Keychain 与前端 Query invalidation。

## 不做什么

- 不为移动端预建 trait，不新建平台插件体系，不扩展更新产品能力。

## 当前上下文

- 当前 commands 仍会调用 runtime services；services 又会直接拿 Repository/connection、组织事务并拼同步 payload。
- Launcher 是独立窗口，不是独立业务域；它应与主窗口调用同一 Task application use case。
- Platform 已有窗口/OS 能力，但 runtime 与 platform 的职责仍需按新 workspace 重新接线。

## Command 设计

- 每个 command 只做：解析 owned input DTO、从 AppState 取得 application service、await use case、映射 `AppError`、返回 owned output DTO。
- CRUD 成功后由前端 mutation 根据返回值和 Query keys 做失效；不 emit 业务实体事件。
- 仅同步状态、窗口状态、快捷键/深链等持续状态可以 emit 有限事件。
- `AppState` 在 startup composition 一次性构建 concrete dependencies；无全局可变静态状态。

## Platform 切分

- `platform`：窗口创建/展示/隐藏/尺寸、tray、快捷键、OS Keychain/credential adapter、Updater adapter。
- `runtime`：Tauri plugin 注册、State 管理、事件桥接、退出协调、同步调度启动。
- `application`：Launcher Task 创建、默认 Space 解析、更新检查等业务用例，不知道窗口 label 或 Tauri API。

## 前端接入

- 统一 API facade 的 command 名、DTO、错误码；不允许 feature 绕过 facade 直接 invoke 临时 command。
- TanStack Query mutation 在本地成功后立即更新/失效；同步只更新后台状态，远端回放变化再失效对应 query。
- Launcher 的创建表单使用与主应用相同的 Space/Project/WorkState 输入，差异仅是窗口 session UX。

## 约束

- command 不直接访问 Repository、SQL 或 sync 实现。
- platform 不依赖业务模型或数据库。
- async command 参数与返回 DTO 必须为 owned serde 类型。

## 退出条件

- `runtime/services` 不再承担业务逻辑。
- Launcher 与主窗口共享业务语义，且本地 CRUD 不等待同步。
- 前端错误码、Query invalidation 与同步状态符合新合约。

## 验证

- 定向 command 装配、Launcher、同步状态、窗口退出与前端契约测试。

## 风险

- 不要为了让旧 command 继续工作保留两个 DTO 体系；硬切后由 R9 清理所有旧 invoke。
- Tauri async command 不可持有借用参数跨 await，所有 input/output 必须 owned。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
- [R7 同步引擎](../2026-07-22-r7-sync-engine/SPEC.md)
