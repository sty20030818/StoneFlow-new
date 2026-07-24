# 协议字段映射 · 方言 · 错误 · CI（P0）

> 表名以 [PG-SCHEMA.md](./PG-SCHEMA.md) 为准（`entity_state` / `upload_acks`）。  
> 门面白话名见 [DESIGN.md](./DESIGN.md)。

## 1. 核心类型 ↔ 存储

### 1.1 `SyncOperation` → 上传

| Rust 字段 | 用途 | 落库 |
|---|---|---|
| `device_id` | 幂等左键 | `sync_upload_acks.device_id`；`sync_change_log.device_id` |
| `operation_id` | 幂等右键 | 同上 `operation_id` |
| `mutations[]` | 同 op 内顺序执行 | 每 mutation 一行 change_log + 更新 entity_state / tombstone |
| `created_at` | 提交时间（RFC3339 字符串） | `committed_at` TEXT |

### 1.2 `SyncMutation` → `mutation_kind` + `payload_json`

| kind | `mutation_kind` | payload |
|---|---|---|
| `Patch` | `patch` | 可 serde 回 `SyncMutation` 的 JSONB |
| `Lifecycle` | `lifecycle` | 同上 |
| `Tombstone` | `tombstone` | 同上；`deletion_seq` 占用序号后写回 |

P1 对齐现 `write_change_payload` 形状，不另发明 envelope。

### 1.3 `EntityIdentity`

| 字段 | 列 |
|---|---|
| `entity_type` | `entity_type` |
| `entity_id` | `entity_id` |
| `generation` | `generation` |

### 1.4 `EntitySnapshot` → 表 `sync_entity_state`

| 字段 | 列 |
|---|---|
| `entity.*` | PK 三列 |
| `fields` | `fields_json` |
| `field_sequences` | `field_versions_json` |
| `lifecycle` | `lifecycle_state` |
| `lifecycle_seq` | `lifecycle_seq` |
| `updated_seq` | `updated_seq` |

### 1.5 `Tombstone` → `sync_tombstones`

| 字段 | 列 |
|---|---|
| `entity.*` | PK 三列 |
| `deletion_seq` | `deletion_seq` |
| `deleted_at` | `deleted_at` |

### 1.6 上传结果（原 `PushResult`）

| 字段 | 来源 |
|---|---|
| `committed_seq` | 本 op 最后 mutation 的 `server_seq`，或 `sync_upload_acks` 已存值 |
| `was_already_applied` | 命中 ack 表或 `23505` 后回读 |

门面类型可命名 `UploadResult`（字段与 `PushResult` 同，便于迁移）。

### 1.7 `SequencedMutation`（下载增量）

| 字段 | 列 |
|---|---|
| `server_seq` | `sync_change_log.server_seq`（同步序号） |
| `mutation` | `payload_json` |
| `committed_at` | `committed_at`（不参与 LWW） |

### 1.8 `Baseline`（全量同步）

| 字段 | 来源 |
|---|---|
| `cursor.server_seq` | `COALESCE(MAX(server_seq), 0)` |
| `entities` | 全表 `sync_entity_state` |
| `tombstones` | 全表 `sync_tombstones` |

### 1.9 配置

| 旧 | 新 |
|---|---|
| `url` + `token` | `database_url` |
| 设置文案 | **同步数据库连接** |

## 2. SQL 方言差异

| 点 | 现 libsql | 目标 Postgres |
|---|---|---|
| 占位符 | `?1` | `$1`（sqlx） |
| 新序号 | `last_insert_rowid()` | `INSERT … RETURNING server_seq` |
| UPSERT 状态 | 现 persist 逻辑 | `ON CONFLICT` → `sync_entity_state` |
| JSON | TEXT | JSONB |
| 时间 | TEXT | TEXT（保持） |
| 幂等冲突 | 字符串 match unique | **PG `23505`** |
| 最早序号 | `MIN(server_seq)` | 同 |
| 实体计数 | `SUM(entity_type = 'x')` | `COUNT(*) FILTER (WHERE …)` |
| 事务 | libsql | sqlx::Transaction |

## 3. 现 API → 门面 / postgres

| 现函数 | 目标 | 备注 |
|---|---|---|
| `open_remote` | `postgres::connect(database_url)` | |
| `bootstrap_protocol_schema` | `postgres::schema::ensure_ready` | |
| `submit_operation` | `postgres::upload` 或内部同名 | 事务语义不变 |
| `push_operations` | 门面 `upload_operations` | 循环 upload |
| `fetch_protocol_changes` | 门面 `download_after` | limit 默认 200 |
| `ensure_cursor_is_available` | 并入 download_after | 过期 → `CursorExpired` |
| `fetch_protocol_baseline` | 门面 `download_full` | |
| `probe` | 门面 `health` | |
| `diagnose_remote` | 门面 `diagnose` | |

runtime 只依赖门面 + `SyncRemoteConfig`，不依赖 sqlx。

**不**默认引入 `RemoteSyncStore` trait；见 DESIGN。

## 4. 错误模型

| Kind | 典型触发 | 用户侧提示方向 |
|---|---|---|
| `Validation` | 空 mutations、坏连接串格式 | 检查输入 |
| `Authentication` | PG 密码错、角色拒绝 | 检查连接串账号权限 |
| `RemoteDatabase` | 网络、超时、断开 | 可重试 |
| `Schema` | 版本不匹配、无建表权限 | 不可自动修 |
| `Serialization` | payload 坏 | 数据/协议问题 |
| `Protocol` | entity-gone 等 | 协议层 |
| `CursorExpired` | 增量已裁剪 | 改全量同步 |
| `LocalDatabase` | 本机 SQLite | storage/runtime |
| `Internal` | 其它 | |

| PG/sqlx | 映射 |
|---|---|
| 认证失败 | `Authentication` |
| URL 无法解析 | `Validation` |
| 超时 / refused | `RemoteDatabase` |
| `23505` on `sync_upload_acks` | 幂等成功路径，不抛给用户当失败 |
| 其它 | `RemoteDatabase` 或 `Schema` |

文案：去掉「Turso」；用「云端副本 / 同步数据库」。

## 5. CI 门槛（P2 启用）

```bash
# src-tauri：依赖树不得再出现 libsql
if cargo tree -p stoneflow -i libsql 2>/dev/null | grep -q libsql; then
  echo "error: libsql still in stoneflow dependency tree"
  cargo tree -p stoneflow -i libsql
  exit 1
fi
```

- P1 前：文档 + 可选脚本，不强制红 CI。  
- P2 去 libsql 后：接入 CI。  
- 本地验收：构建日志无 `libsql_ffi` 双符号警告。  
- 协议回归：`postgres` 集成测 + 纯 `apply_mutation` 单元测。

## 6. 设置页（P2）

| 项 | 约定 |
|---|---|
| 标签 | 同步数据库连接 |
| 字段 | `database_url` |
| 空 | 不同步 |
| 展示 | host 可显示；密码掩码 |
| 日志 | 禁止完整 URL |
| 旧 Turso | 硬切丢弃 |

## 7. P0 验收

- [x] DESIGN：白话词汇 + 无空 Port 层  
- [x] PG-SCHEMA：`entity_state` / `upload_acks` + TEXT 时间  
- [x] MAPPING：对照更新  
- [ ] 代码（P1 起）  
