# sync-worker - 设计

## 设计范围

`sync-worker` 负责本地 SQLite 副本与 Turso/libSQL 远端副本的同步协议实现。它不负责前端展示、同步设置 UI、业务实体编辑或 Tauri command 装配。

## 实现总览

```text
runtime 调度
  -> sync-worker
      -> 读取本地 cursor / pending mutations
      -> pull 远端 change log 或 snapshot
      -> 在本地事务中 apply
      -> push 本地 pending mutations
      -> 更新 ack 与 cursor
  -> runtime 发出同步状态和工作区变更事件
```

同步对象为 Space、Project、Task、TaskLink、View 和可同步 Setting。业务数据首先写入本地 SQLite；同一事务中生成 `sync_mutations` 记录，worker 再把这些记录可靠传向远端。

## 核心流程

### Pull

1. 读取本地 `server_seq` cursor。
2. cursor 可用时读取远端增量 change log；新副本或远端要求时读取 snapshot。
3. 在本地事务中按实体关系应用远端记录，并更新 cursor。
4. 对删除、硬删除和活动 tombstone 使用专门规则，避免旧记录复活。

### Push

1. 按本地 client sequence 读取 pending mutations。
2. 在远端事务中写入 canonical 表、change log 和 ack。
3. 本地收到 ack 后标记 mutation 已确认，并推进同步状态。

远端以设备 ID 与客户端序号识别 mutation，重复执行同一 mutation 不应产生重复业务效果。

### 副本基线

- 空本地副本可从远端 snapshot 初始化。
- 已有本地业务数据但没有远端 cursor 时，worker 不自动用 snapshot 覆盖本地数据，而是返回 `baseline_required`。
- 恢复或基线迁移完成后，后续同步再次走常规 pull/push。

## 状态与数据模型

| 数据 | 用途 |
|---|---|
| `sync_mutations` | 本地待推送或已确认的业务变更 |
| `sync_cursor` | 设备标识、远端 `server_seq`、恢复标记等游标 |
| 远端 canonical tables | 远端当前副本 |
| 远端 change log | 增量拉取的有序变更记录 |

状态向上层暴露为 disabled、syncing、synced、offline_pending、error 或 needs_attention；副本状态包括 uninitialized、ready、baseline_required 和 diverged。

## 实现单元及协作

| 文件 | 职责 |
|---|---|
| `main.rs` | 进程入口与协议编排 |
| `pull.rs` | snapshot 与增量变更拉取 |
| `push.rs` | pending mutation 推送、ack 与远端日志写入 |
| `apply.rs` | 将远端记录应用到本地或远端副本 |
| `local.rs` / `remote.rs` | 连接与本地、远端访问辅助 |
| `schema.rs` / `migrate.rs` | 同步协议表与迁移 |
| `diagnose.rs` | 本地与远端副本摘要诊断 |
| `types.rs` / `error.rs` | 协议载荷与结构化错误 |

## 异常与恢复

- 本地数据库、远端数据库、认证、序列化和协议错误有独立错误类别。
- 网络不可用时，本地业务写入继续成功，待同步 mutation 保留，状态为 offline_pending 或 error。
- 副本状态需要人工关注时，前端只展示原因并提供配置或手动重试，不暴露内部协议步骤。

## 关键设计问答

### 为什么本地 SQLite 是主事实源？

用户必须能离线使用，且同步失败不应阻止任务编辑。远端副本用于多设备收敛，不作为前端的直连数据源。

### 为什么不提供常规冲突工作台？

当前产品只面向单人多设备。协议应自动收敛并避免将复杂度转移给用户；若未来出现无法自动处理的冲突，再以真实案例设计用户路径。

### 为什么前端不参与 pull/push 编排？

同步协议需要事务、cursor、数据库连接和可靠错误分类。前端只读状态并触发重试，避免形成第二套同步状态机。

## 已知限制

- 当前同步目标和后续账号系统无绑定；Turso/libSQL 也不是永久产品承诺。
- 文本字段的并发修改虽以协议自动处理为目标，但不等于所有设备并发场景都已被产品级验证。
- 领域模型重构需要同时更新本地 schema、远端 schema、mutation payload、apply 规则和基线策略。

## 验证方式

```bash
cargo test --manifest-path src-tauri/Cargo.toml -p stoneflow-sync-worker
cargo check --manifest-path src-tauri/Cargo.toml --workspace
```
