# PostgreSQL 云端副本 Schema（P0）

> 语义对齐现 `remote_schema.rs`（`PROTOCOL_SCHEMA_VERSION = 1`）。  
> 新库硬切：表名用更直白命名；**不**从旧 Turso 自动迁数据。  
> 版本不匹配则拒绝，禁止自动 DROP。

## 元数据

| 项 | 值 |
|---|---|
| `PROTOCOL_SCHEMA_VERSION` | `1` |
| 搜索路径 | 默认 `public` |
| 时间列 | **TEXT，存 RFC3339 UTC 字符串**（与现协议零摩擦；KISS） |
| JSON 列 | **JSONB** |

## 表一览（白话）

| 表 | 白话 | 职责 |
|---|---|---|
| `sync_schema` | 协议版本 | 单行版本号 |
| `sync_change_log` | 变更日志 | 有序变更；`server_seq` = 同步序号 |
| `sync_entity_state` | 实体当前状态 | 投影（原 snapshots） |
| `sync_tombstones` | 删除标记 | 永久删除占位 |
| `sync_upload_acks` | 上传确认 | 幂等（原 applied_operations） |

## DDL

```sql
CREATE TABLE IF NOT EXISTS sync_schema (
    name    TEXT PRIMARY KEY NOT NULL CHECK (name = 'stoneflow'),
    version BIGINT NOT NULL
);

-- 实体当前状态（投影）
CREATE TABLE IF NOT EXISTS sync_entity_state (
    entity_type         TEXT NOT NULL
        CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
    entity_id           TEXT NOT NULL,
    generation          BIGINT NOT NULL CHECK (generation >= 1),
    fields_json         JSONB NOT NULL,
    field_versions_json JSONB NOT NULL,
    lifecycle_state     TEXT NOT NULL
        CHECK (lifecycle_state IN ('active', 'archived', 'trashed')),
    lifecycle_seq       BIGINT NOT NULL,
    updated_seq         BIGINT NOT NULL,
    PRIMARY KEY (entity_type, entity_id, generation)
);

-- 上传确认（幂等）
CREATE TABLE IF NOT EXISTS sync_upload_acks (
    device_id     TEXT NOT NULL,
    operation_id  TEXT NOT NULL,
    committed_seq BIGINT NOT NULL,
    committed_at  TEXT NOT NULL,
    PRIMARY KEY (device_id, operation_id)
);

-- 删除标记
CREATE TABLE IF NOT EXISTS sync_tombstones (
    entity_type   TEXT NOT NULL
        CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
    entity_id     TEXT NOT NULL,
    generation    BIGINT NOT NULL CHECK (generation >= 1),
    deletion_seq  BIGINT NOT NULL,
    deleted_at    TEXT NOT NULL,
    PRIMARY KEY (entity_type, entity_id, generation)
);

-- 变更日志（同步序号 = server_seq）
CREATE TABLE IF NOT EXISTS sync_change_log (
    server_seq     BIGSERIAL PRIMARY KEY,
    device_id      TEXT NOT NULL,
    operation_id   TEXT NOT NULL,
    entity_type    TEXT NOT NULL
        CHECK (entity_type IN ('space', 'project', 'task', 'task_link', 'view')),
    entity_id      TEXT NOT NULL,
    generation     BIGINT NOT NULL CHECK (generation >= 1),
    mutation_kind  TEXT NOT NULL
        CHECK (mutation_kind IN ('patch', 'lifecycle', 'tombstone')),
    payload_json   JSONB NOT NULL,
    committed_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sync_change_log_operation
    ON sync_change_log (device_id, operation_id, server_seq);

CREATE INDEX IF NOT EXISTS idx_sync_change_log_entity
    ON sync_change_log (entity_type, entity_id, generation, server_seq);

CREATE INDEX IF NOT EXISTS idx_sync_tombstones_identity
    ON sync_tombstones (entity_type, entity_id, generation);
```

## 与旧 Turso/SQLite 表名对照

| 旧表 | 新表 | 备注 |
|---|---|---|
| `sync_schema` | `sync_schema` | 同 |
| `sync_change_log` | `sync_change_log` | 同；`server_seq` 列名保持 |
| `sync_entity_snapshots` | **`sync_entity_state`** | 更直白 |
| `sync_applied_operations` | **`sync_upload_acks`** | 上传确认 |
| `sync_tombstones` | `sync_tombstones` | 同；文档称「删除标记」 |

## 类型方言

| 点 | 旧 | 新 |
|---|---|---|
| JSON | TEXT | **JSONB** |
| 时间 | TEXT RFC3339 | **TEXT RFC3339**（不改 TIMESTAMPTZ，减少互转） |
| 同步序号 | AUTOINCREMENT | **BIGSERIAL** + `RETURNING server_seq` |
| 计数 | `SUM(entity_type = 'x')` | `COUNT(*) FILTER (WHERE …)` |

## Bootstrap

1. `CREATE TABLE/INDEX IF NOT EXISTS`。  
2. `sync_schema`：无行 → insert version=1；version=1 → OK；其它 → `Schema` 错误，不 DROP。

## 序列与并发

- 每个 mutation 一行 `sync_change_log`。  
- 整个 `SyncOperation` **一个事务**：查 `sync_upload_acks` → 写 log/state/tombstone → 写 ack。  
- 并发同 op：PK `23505` → 回读已确认 `committed_seq`（幂等成功）。

## 权限（文档建议）

专用角色仅对上述五表 `SELECT/INSERT/UPDATE`（及实现所需的 `DELETE`）；bootstrap 可用 owner 跑一次。

## v1 不做的表

| 表 | 原因 |
|---|---|
| `devices` | 同步位置在本机；device_id 仅幂等 |
| 业务表镜像 | 云端只放协议数据 |
| `account_id` | 单副本 = 不同连接串 |
