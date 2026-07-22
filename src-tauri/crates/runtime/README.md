# stoneflow-runtime

Tauri transport 与组合层。这是唯一允许依赖 Tauri 并装配各层的 crate。

## 职责

- Tauri commands / 事件
- composition（装配 application/storage/sync/platform）
- 同步调度入口（调用 `stoneflow-sync`）
- 稳定错误码映射

## 过渡说明

`services/` 仍承载旧 adapter 与部分编排壳，供现有 command 编译。R2-R8 纵切迁移后，由 R9 删除生产入口。

## 禁止

- 新增直接 SQL / repository 调用到 command
- 让 domain / application 反向依赖本 crate
