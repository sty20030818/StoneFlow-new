# sync - 设计

## 设计范围

`sync` 是不依赖 Tauri 的 远端协议库。它负责远端 schema、幂等 operation 提交、增量读取与基线读取；本地 SQLite 回放、Outbox 确认、调度、状态与 Tauri 事件由 `runtime` 负责。

## 实现总览

```text
runtime 调度
  -> 读取本地 Outbox / cursor + remote instance identity
  -> sync library
      -> 每条 Postgres 短连接先核对远端 identity
      -> Postgres 协议表（schema / change_log / entity_state / …）
  -> runtime 在本地短事务中物化 replica、确认 Outbox、同时更新 identity + cursor
  -> runtime 在每个成功 round 提交后立即发出工作区变更事件
```

同步对象为 Space、Project、Task、TaskLink 和 View。业务数据首先写入本地 SQLite；业务写入与 Outbox 在同一事务中提交，runtime 再将完整 operation 交给 `sync` 幂等上推。

## 核心流程

### Pull

1. runtime 读取本地 `sync:remote_instance_id` 与 `sync:last_pulled_server_seq`；已有 cursor 却没有 identity 时 fail closed。
2. `sync` 按服务端 sequence 读取有限页的 change log；首次副本或 cursor 过期时读取 baseline。
3. runtime 每页在一个本地短事务内按字段级 LWW、生命周期优先和 generation 规则回放，并原子写入远端 identity 与 cursor。
4. tombstone 会物理删除业务实体但保留最小协议元数据，旧 patch 不能复活实体。

### Push

1. runtime 按用户 operation 聚合 Outbox；同一实体的可合并 patch 在 operation 内收敛。
2. `sync` 在远端事务内以 `(device_id, operation_id)` 去重，写入 change log、snapshot 或 tombstone。
3. runtime 收到成功结果后才删除该 operation 的本地 Outbox 条目。

远端以设备 ID 与 operation ID 识别 operation，重复执行同一 operation 不应产生重复业务效果。

连接建立后固定 `search_path` 到首个有效 schema，身份检查、初始化与全部业务 SQL 不回落到其它 schema。每次 upload / download 都携带本机已绑定的 `expected_instance_id`，在 schema 校验前后核对实际 identity。连接串指向另一实例或连接期间远端被替换时，本轮在远端业务读写前失败。上传事务持有 schema 记录共享锁并重验版本；该版本门禁不因旧迁移退役而删除。

### 副本基线

- 首次副本可从远端 baseline 初始化。
- cursor 过期时，runtime 以同一份 baseline 原子替换本地同步副本。
- baseline 仅是首次或恢复路径；正常同步始终走增量 pull。
- 退役旧本地迁移后，其他设备升级当前代码、保留完整本地备份，再重建本地并从同一云端 v3 全量恢复。未同步内容、本机设置和活动历史不在云端恢复范围，不能以全量恢复替代本地备份；切换约束见 [ADR-0004](../../../Documents/01-架构/adr/ADR-0004-single-view-contract-and-sync-v3.md)。

### 远端身份与重新绑定

- 协议 schema v3 在远端 `sync_schema` 持久化生成 `instance_id`；只初始化空同步 schema，v1/v2 和残缺 schema 拒绝接入。v2 到 v3 专用迁移 API 与工具已退役；本次不改变已有云端 v3 的 instance_id、generation、序号或 acks。
- 本地 identity 与 server cursor 同属 `sync_cursors`，任何推进 cursor 的事务都同时写入 identity。相同 identity 才允许继续普通同步；不同 identity 或无法证明来源的 cursor 进入 `needs_attention`。
- 普通 configure 只验证和绑定，不承担切换数据集。未绑定状态下本机与远端同时已有数据也拒绝静默合并。
- 显式 rebind 在下载候选 baseline 后开启 SQLite `IMMEDIATE` 事务，并在事务内再次确认 Outbox 为零。有待上传变更时不改钥匙串、本地绑定或业务副本。
- 非空候选远端在用户确认后成为新的本机 baseline；空远端保留本机业务，清除旧远端专属位置，并等待 origin seed。两条路径都不会静默清空 Outbox。

## 状态与数据模型

| 数据 | 用途 |
|---|---|
| `outbox` | 本地待推送的业务 operation 条目；远端确认后才删除 |
| `sync_cursors` / `sync_devices` | 本机设备标识、远端 `instance_id`、`server_seq` 与恢复标记 |
| `sync_protocol_entities` | 本地字段版本与 tombstone 的最小协议副本 |
| 远端 `sync_schema` v3 | 协议版本与稳定 `instance_id` |
| 其余远端 `sync_*` 表 | 远端 snapshot、tombstone、operation 去重与有序 change log |

状态向上层暴露为 disabled、syncing、synced、offline_pending、error 或 needs_attention；副本状态包括 uninitialized、ready、baseline_required 和 diverged。

## 实现单元及协作

| 文件 | 职责 |
|---|---|
| `protocol.rs` | 字段级 LWW、生命周期与 tombstone 规则 |
| `postgres/` | sqlx：连接、DDL、上传、下载、health |
| `lib.rs` | 门面：`upload_operations` / `download_*` / `health` / `diagnose_cloud` |
| `error.rs` | 协议边界的结构化错误 |

## 异常与恢复

- 本地数据库、远端数据库、认证、schema、序列化和协议错误有独立错误类别。
- 网络不可用时，本地业务写入继续成功，Outbox 保留，runtime 以受限退避重试。
- 鉴权、schema 与协议错误进入 `needs_attention`；设置页展示原因与手动重试入口，不暴露内部协议步骤。
- 连接错误使用固定分类消息，不回显 SQLx 原始连接错误。日志、诊断和 renderer 的地址只保留结构化解析后的 scheme / host / port / path，全部 userinfo、query 与 fragment 均不进入展示边界。
- 一轮 SQLite/cursor 提交成功后立即发送该轮 workspace change event；若后续排队轮失败，失败状态保留，但前一轮事件不会被跨轮累积吞掉。rebind 提交另外立即发送覆盖全部同步领域的 `reason: rebind` 事件。

## 关键设计问答

### 为什么本地 SQLite 是主事实源？

用户必须能离线使用，且同步失败不应阻止任务编辑。远端副本用于多设备收敛，不作为前端的直连数据源。

### 为什么不提供常规数据冲突工作台？

当前产品只面向单人多设备。字段与生命周期冲突由协议自动收敛；若未来出现无法自动处理的数据冲突，再以真实案例设计用户路径。远端 rebind 是独立的数据集切换确认，不是字段冲突工作台。

### 为什么前端不参与 pull/push 编排？

同步协议需要事务、cursor、数据库连接和可靠错误分类。前端只读状态并触发重试，避免形成第二套同步状态机。

## 已知限制

- 当前同步目标和后续账号系统无绑定；云端是用户自备 Postgres，不是托管账号体系。
- 文本字段的并发修改虽以协议自动处理为目标，但不等于所有设备并发场景都已被产品级验证。
- 领域模型重构需要同时更新本地 schema、远端 schema、mutation payload、apply 规则和基线策略。

## 验证方式

```bash
cargo test --manifest-path src-tauri/Cargo.toml -p stoneflow-sync
cargo check --manifest-path src-tauri/Cargo.toml --workspace
# 有 Postgres 时：STONEFLOW_SYNC_DATABASE_URL=... cargo test -p stoneflow-sync -- --ignored
```

## 实现状态

- 传输面：用户 Postgres（sqlx）；无 libsql / Turso。
- 单设备路径：上传、下载、全量基线、origin seed、协议预热与语义物化已落地。
- 双设备与性能证据：延期，不在本设计文档展开。
- 远端身份 v3、普通配置 fail closed、显式 rebind、逐成功 round 事件与结构化安全地址已落地；真实 PostgreSQL 合约测试仍依赖外部测试库，桌面/WebView 行为仍归统一产品验收。
