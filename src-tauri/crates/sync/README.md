# stoneflow-sync

同进程 R7 远端协议库。负责 Turso schema、operation push、cursor pull、baseline 与远端只读诊断。

## 职责

- 打开远端 Turso 连接并校验 R7 schema
- 提交 operation、读取增量变更与 baseline
- 提供远端 probe / diagnose 只读结果

## 公开入口

- `push_operations(&SyncRemoteConfig, &[SyncOperation])`
- `fetch_protocol_changes(&SyncRemoteConfig, cursor)` / `fetch_protocol_baseline(&SyncRemoteConfig)`
- `probe(&SyncRemoteConfig)` / `diagnose_remote(&SyncRemoteConfig)`

## 禁止依赖

- 不得依赖 Tauri / AppHandle
- 不得通过 stdout/stderr JSON 与宿主通讯
- 不得再提供独立 binary sidecar

调度、单飞合并、UI 事件与错误码映射由 `runtime` 负责。
