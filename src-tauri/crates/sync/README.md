# stoneflow-sync

同进程逻辑同步库。负责 Turso 协议、push/pull/migrate 与只读诊断。

## 职责

- 打开本地 SQLite 与远端 Turso 连接
- 执行 push / pull / migrate
- 提供 probe / diagnose 只读结果

## 公开入口

- `run(SyncRequest)`
- `probe(&SyncRemoteConfig)`
- `diagnose(database_path, &SyncRemoteConfig)`

## 禁止依赖

- 不得依赖 Tauri / AppHandle
- 不得通过 stdout/stderr JSON 与宿主通讯
- 不得再提供独立 binary sidecar

调度、单飞合并、UI 事件与错误码映射由 `runtime` 负责。
