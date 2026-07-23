# stoneflow-runtime

Tauri transport 与组合层。这是唯一允许依赖 Tauri 并装配各层的 crate。

## 职责

- Tauri commands / 事件
- composition（装配 application/storage/sync/platform）
- 同步调度入口（调用 `stoneflow-sync`）
- 稳定错误码映射

## 过渡说明

业务服务经 `AppState` 装配；`update/` 为更新适配；无 `services` 过渡层。

## 禁止

- 新增直接 SQL / repository 调用到 command
- 让 domain / application 反向依赖本 crate
