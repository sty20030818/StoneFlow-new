# 同步平台 — 模块与边界设计（P0）

> 实现前契约。原则：KISS、DRY、高内聚低耦合；依赖方向符合六边形 / 整洁架构。  
> **不**为多租户/多后端预埋插件；**不**为「像架构图」多拆空目录。

## 0. 词汇表（对外 vs 对内）

| 用户 / 文档白话 | 代码 / 协议（可保留） | 说明 |
|---|---|---|
| 待上传 | outbox | 本地事务性待发队列（业界标准名） |
| 上传 | upload（门面）；内部可仍 submit | 把 operation 写入云端副本 |
| 下载 | download（门面）；内部可仍 fetch | 按同步位置拉增量或全量 |
| 同步位置 | cursor / `SyncCursor` | 本机已追上的同步序号 |
| 同步序号 | `server_seq`（列名保持，少改协议） | 云端变更总顺序 |
| 全量同步 | baseline / `Baseline` | 首次或位置过期时拉当前全貌 |
| 删除标记 | tombstone / `Tombstone` | 永久删除占位（实现者通用词） |
| 云端副本 | Postgres 同步库 | 用户自备；Neon ≈ 自建 |
| 连通检查 | health / 原 probe | 设置页测连接 |
| 实体当前状态 | `sync_entity_state` | 远端投影表 |
| 上传确认 | `sync_upload_acks` | 幂等 `(device_id, operation_id)` |

产品心智：

```text
本机编辑 → SQLite + 记入「待上传」
              ↓ 有网
         上传到「云端副本」(Postgres)
              ↓
         其它设备「下载」→ 写入本机 SQLite
```

## 1. 系统分层（依赖只向内）

```text
┌─────────────────────────────────────────────────────────────┐
│  UI / Tauri（runtime）                                       │
│  设置：同步数据库连接；展示状态；触发同步                     │
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  Application（runtime/sync）                                 │
│  待上传归并、本地同步位置、下载后写入 SQLite、调度重试         │
│  只依赖 stoneflow_sync 门面 + storage；不碰 sqlx / 原始 PG SQL│
└───────────────────────────┬─────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────┐
│  stoneflow_sync                                              │
│                                                              │
│  protocol + error     ← 纯核心（无 IO）                      │
│       mutation 形状、apply_mutation / LWW、SyncError         │
│                                                              │
│  lib.rs 门面           ← 应用用例入口                         │
│       upload_* / download_* / health / diagnose              │
│                                                              │
│  postgres/             ← 唯一 IO 边缘（云端副本适配器）        │
│       连接、DDL、SQL、事务；调用 protocol::apply_mutation      │
│       （删除 libsql / Turso）                                │
└───────────────────────────┬─────────────────────────────────┘
                            │ Postgres wire
┌───────────────────────────▼─────────────────────────────────┐
│  用户自备 PostgreSQL — 云端副本（仅同步表，非业务库）           │
└─────────────────────────────────────────────────────────────┘

本地业务边：
  storage + SeaORM + SQLite  ← 唯一业务 writer
  与 postgres 模块无共享连接、无共享事务
```

### 依赖规则（强制）

| 层 | 可依赖 | 禁止 |
|---|---|---|
| `protocol` | std、serde、本模块纯类型 | sqlx、libsql、Tauri、SeaORM |
| `postgres` | protocol、error、sqlx/postgres | Tauri、业务 repository |
| `lib` 门面 | protocol、postgres、error | 业务表 SQL |
| `runtime` | 门面 + storage | sqlx 类型、adapter 私有结构 |
| 业务 application | storage、domain | 直接拼 `postgresql://` 做同步 |

**一句话**：合并规则在核心；SQL 在 `postgres`；调度在 runtime。

## 2. KISS 模块切分（不搞空 Port 层）

**已定：不强制独立 `ports/` + `RemoteSyncStore` trait。**  
只有一个云端实现时，**模块边界 = 端口**；需要 mock 再抽单文件 trait。

| 模块 | 职责 | 对外 |
|---|---|---|
| `protocol` | 冲突裁决、DTO | 纯函数 + 类型 |
| `error` | 错误分类 | `SyncError` |
| `postgres` | 云端副本全部 IO | 仅被门面调用 |
| `lib.rs` | 门面编排 | 稳定、偏白话 API |
| runtime outbox/pull | 本机生命周期 | 调门面 |

推荐目录（P1，扁平）：

```text
stoneflow_sync/src/
  protocol.rs
  error.rs
  lib.rs                 # upload / download / health
  postgres/
    mod.rs               # connect、短连接策略
    schema.rs            # bootstrap DDL
    upload.rs            # 原 submit_operation 语义
    download.rs          # 增量 + 全量
    health.rs            # 连通 / 诊断（可与 download 合并若太碎）
```

文件可再合并（例如 `upload`+`download` → `remote.rs`），以「打开文件能懂」为准，禁止为对称拆一堆空文件。

### 门面语义（冻结）

```text
upload_operations(config, &[SyncOperation]) -> Vec<UploadResult>
  // 逐 operation 事务；整批非单事务（与现 push_operations 一致）

download_after(config, after_revision, limit) -> Vec<SequencedMutation>
  // 同步位置过期 → CursorExpired，runtime 改走全量

download_full(config) -> Baseline

health(config) -> HealthOutput          // 原 probe
diagnose(config) -> DiagnosticsOutput   // 原 diagnose_remote
```

- 内部实现可继续叫 `submit_operation` 等，与现测例对照。  
- **`apply_mutation` 只在一处**；`postgres` 上传事务内调用它，禁止复制一份合并规则。  
- 连接：P1 **短连接**；池化有证据再加。

### 可选：单 trait（非默认）

若集成测要替换实现，允许 **一个** 文件：

```text
// replica.rs — 可选
trait SyncReplica {
  async fn ensure_ready(&self) -> Result<(), SyncError>;
  async fn upload(&self, op: &SyncOperation) -> Result<UploadResult, SyncError>;
  async fn download_after(...) -> ...;
  async fn download_full(...) -> ...;
  async fn health(...) -> ...;
}
```

默认路径：**无 trait**，门面直接调 `postgres::*`。

## 3. 配置契约

```rust
pub struct SyncRemoteConfig {
    /// 同步数据库连接串（Neon / 自建 / 托管同一字段）
    /// postgresql://user:pass@host:5432/dbname?sslmode=require
    pub database_url: String,
}
```

| 旧（Turso） | 新 |
|---|---|
| `url` + `token` | 仅 `database_url` |
| 未配置 | 同步跳过 |

- 设置页：**同步数据库连接**（一个输入框；密码掩码）。  
- 钥匙串优先；日志只打 host/db，禁止完整 URL。  
- 旧 Turso 配置：**硬切丢弃**。

## 4. 与本地 storage 的边界

| | 本机 SQLite | 云端 Postgres |
|---|---|---|
| Writer | SeaORM（业务） | `postgres`（仅同步表） |
| 内容 | 业务 + 待上传 + 本地同步位置 | 变更日志 / 实体状态 / 删除标记 / 上传确认 |
| 事务 | 业务 + outbox 确认 | 单次 upload operation |
| ORM | SeaORM | **sqlx only**（表少，不为远端建 SeaORM 迁移） |

## 5. 测试策略

| 层 | 测什么 |
|---|---|
| protocol | LWW / 删除标记 / generation（无 IO） |
| postgres | 幂等上传、并发、位置过期、bootstrap 版本 |
| runtime | 待上传 → 上传 → 确认；下载 → 本地物化 |

禁止：测试再链接 libsql。

## 6. 明确不做

- 独立 `ports/` 包、多 adapter 注册表、DI 容器  
- HTTP Sync 中台 / Bearer / OAuth / 设备注册  
- CRDT、业务表镜像到 PG、进程外 sidecar  
- 为整洁而 domain/app/infra 三套空壳  

## 7. 首次绑定 / 多场景引导

见 [BOOTSTRAP.md](./BOOTSTRAP.md)：纯函数 `BootstrapPlan` + seed / upload / pull 执行分离。

## 8. 文档索引

| 文档 | 内容 |
|---|---|
| [SPEC.md](./SPEC.md) | 产品与阶段 |
| [TASKS.md](./TASKS.md) | 勾选清单 |
| [PG-SCHEMA.md](./PG-SCHEMA.md) | 云端副本 DDL |
| [MAPPING.md](./MAPPING.md) | 字段映射、方言、错误、CI |
| [BOOTSTRAP.md](./BOOTSTRAP.md) | 新/老设备 × 空/有数据 场景矩阵 |
