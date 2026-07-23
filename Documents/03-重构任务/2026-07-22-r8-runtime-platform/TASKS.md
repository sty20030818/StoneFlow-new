# R8 Runtime 与 Platform - Tasks

## 当前阶段

**已完成。** 阶段一至四落地；`runtime/services` 生产路径已拆除。物理死代码清理由 R9 承接。

## 阶段一：完成 Runtime Composition 与命令薄层

- [x] 建立最终 `AppState`、composition、稳定 `AppError` 映射
- [x] Space/Project/Task/View/Activity command 薄 transport
- [x] PersistenceAdapter 迁入 `storage::adapters`
- [x] 定向测试

## 阶段二：接入 Launcher 与桌面生命周期

- [x] Launcher 业务进 AppState；创建复用 Task 契约
- [x] tray / shortcut / single-instance 仅 runtime/platform
- [x] 退出有界 sync flush（3s）+ Launcher shutdown
- [x] 定向测试

## 阶段三：连接凭证、同步状态与更新能力

- [x] Keychain：`platform::SyncTokenStore`；`configure_sync` 经 spawn_blocking 读写，token 不进 DTO/日志
- [x] Sync 命令改走 `AppState`；设置页唯一 surface（既有事件 + query）
- [x] Updater 从 `services` 迁出为 `runtime/update/`，与业务事务/同步协议解耦
- [x] Settings / Search / Lifecycle 迁入 `storage::adapters` + AppState

## 阶段四：迁移前端 transport 与删除旧 services

- [x] Launcher 前端去掉 Inbox 选项；默认 `noProject`；`mapLauncherToTaskInput` 同源 createTask
- [x] 业务 command 全部 `State<AppState>`；不再 `build_*_service` 生产路径
- [x] 删除 `runtime/src/services/` 目录
- [x] Rust clippy/tests 通过；Launcher 域测试通过

## 验收对照

| 条件 | 状态 |
|---|---|
| command 不含业务/SQL | 是 |
| platform 不依赖业务库 | 是 |
| Launcher 与主窗共享 Task 创建 | 是（前端 createTask） |
| token 不进前端 DTO | 是 |
| runtime/services 非生产路径 | 是（目录已删） |

## 阻塞

无。R7 阶段五仍为独立验证债。

## 与 SPEC 的实施偏差

1. **Updater 仍单独 `manage`**：依赖 `AppHandle`，不塞进 `AppState` 结构体；仍属 runtime composition。
2. **`DatabaseRuntimeState` / `SyncRuntimeState` 仍双 manage**：与 AppState 字段同源 clone，兼容既有 sync helper；R9 可收敛。
3. **前端 shared types / 路由仍有 inbox 字符串**（如 sidebar、历史路由）：非 Launcher transport 真源；产品路由收口属 R9/产品任务，未扩大本阶段 diff。
4. **Launcher UI 组件测试 `LauncherPage.test` 依赖 jsdom 窗口环境**：域/API 单测已通过；页面测需 vitest 环境（既有约束）。

## 完成记录

- 完成日期：2026-07-23
- 已更新的长期文档：本 TASKS；总任务表状态
- 遗留技术债：
  - R9：双 State 收敛、shared inbox 路由/类型清理、死代码检索
  - R7 阶段五：双设备/性能证据
  - ARCHITECTURE.md 同步（R10 文档任务可覆盖）
