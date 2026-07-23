# sync - 设计

## 设计范围

`sync` 是不依赖 Tauri 的 R7 远端协议库。它负责远端 schema、幂等 operation 提交、增量读取与基线读取；本地 SQLite 回放、Outbox 确认、调度、状态与 Tauri 事件由 `runtime` 负责。

## 实现总览

```text
runtime 调度
  -> 读取本地 Outbox / cursor
  -> sync library
      -> Turso/libSQL R7 protocol tables
  -> runtime 在本地短事务中物化 replica、确认 Outbox、更新 cursor
  -> runtime 发出同步状态和工作区变更事件
```

同步对象为 Space、Project、Task、TaskLink 和 View。业务数据首先写入本地 SQLite；业务写入与 Outbox 在同一事务中提交，runtime 再将完整 operation 交给 `sync` 幂等上推。

## 核心流程

### Pull

1. runtime 读取本地 `sync:last_pulled_server_seq`。
2. `sync` 按服务端 sequence 读取有限页的 change log；首次副本或 cursor 过期时读取 baseline。
3. runtime 每页在一个本地短事务内按字段级 LWW、生命周期优先和 generation 规则回放，并更新 cursor。
4. tombstone 会物理删除业务实体但保留最小协议元数据，旧 patch 不能复活实体。

### Push

1. runtime 按用户 operation 聚合 Outbox；同一实体的可合并 patch 在 operation 内收敛。
2. `sync` 在远端事务内以 `(device_id, operation_id)` 去重，写入 change log、snapshot 或 tombstone。
3. runtime 收到成功结果后才删除该 operation 的本地 Outbox 条目。

远端以设备 ID 与 operation ID 识别 operation，重复执行同一 operation 不应产生重复业务效果。

### 副本基线

- 首次副本可从远端 baseline 初始化。
- cursor 过期时，runtime 以同一份 baseline 原子替换本地同步副本。
- baseline 仅是首次或恢复路径；正常同步始终走增量 pull。

## 状态与数据模型

| 数据 | 用途 |
|---|---|
| `outbox` | 本地待推送的业务 operation 条目；远端确认后才删除 |
| `sync_cursors` / `sync_devices` | 本机设备标识、远端 `server_seq` 与恢复标记 |
| `sync_protocol_entities` | 本地字段版本与 tombstone 的最小协议副本 |
| 远端 `sync_*` 表 | 远端 snapshot、tombstone、operation 去重与有序 change log |

状态向上层暴露为 disabled、syncing、synced、offline_pending、error 或 needs_attention；副本状态包括 uninitialized、ready、baseline_required 和 diverged。

## 实现单元及协作

| 文件 | 职责 |
|---|---|
| `protocol.rs` | 字段级 LWW、生命周期与 tombstone 规则 |
| `protocol_push.rs` | 幂等 operation 提交与远端状态物化 |
| `protocol_pull.rs` | 分页增量与 baseline 读取 |
| `remote_schema.rs` | R7 远端协议表及版本检查 |
| `remote.rs` | Turso/libSQL 远端连接 |
| `error.rs` | 协议边界的结构化错误 |

## 异常与恢复

- 本地数据库、远端数据库、认证、schema、序列化和协议错误有独立错误类别。
- 网络不可用时，本地业务写入继续成功，Outbox 保留，runtime 以受限退避重试。
- 鉴权、schema 与协议错误进入 `needs_attention`；设置页展示原因与手动重试入口，不暴露内部协议步骤。

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
cargo test --manifest-path src-tauri/Cargo.toml -p stoneflow-sync
cargo check --manifest-path src-tauri/Cargo.toml --workspace
```
