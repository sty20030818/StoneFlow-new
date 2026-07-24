# 本地优先同步平台（长期）- Spec

## 背景与目标

后端 R0–R9 已完成：领域模型、单一 SQLite baseline、application/storage 分层、outbox 同步协议、无 Inbox、standalone 归属、前端 hard-cut。

当前工程债与产品演进焦点：

1. **同进程双 SQLite 实现**：本地 `SeaORM + sqlx-sqlite`（`libsqlite3-sys`）与同步 `libsql`（`libsql_ffi`）链接冲突（duplicate symbol 警告）。
2. **同步数据面绑定 Turso/libsql**：远端只需存放操作日志与投影，不必再嵌一套 SQLite 客户端。
3. **个人应用、用户自备库**：用户提供 **任意 PostgreSQL 连接串**（Neon、自建、云厂商托管均可），客户端直连该库作为同步数据面。

本任务定义 **长期目标架构**（可大改）：

- 本地继续 **SQLite 文件 + SeaORM**（业务唯一 writer）
- 同步远端改为 **PostgreSQL**（标准协议；Neon 与自建 **同一条路径**）
- 协议逻辑仍在客户端 `sync` crate（复用现有 push/pull/baseline/LWW）
- 主进程 **去掉 libsql**
- **不**做独立 Sync HTTP 服务、**不**做 Bearer/账号体系（v1）

## 已确认决策

| 项 | 决策 |
|---|---|
| 本地事实源 | SQLite 文件（`stoneflow.sqlite3`） |
| 本地访问 | **继续 SeaORM**（不换 ORM；storage 保持可替换） |
| 任务归属 | `project` \| `standalone`（`project_id IS NULL`）；无 Inbox |
| 同步模型 | **应用层 outbox / cursor / snapshot / tombstone**（不整库文件同步） |
| 同步数据面 | **用户自备 PostgreSQL**（连接串配置） |
| Neon vs 自建 PG | **无区别**：凡支持标准 Postgres 连接即可 |
| 客户端如何碰远端 | **直连 Postgres**（主进程内 PG 驱动，如 sqlx postgres） |
| 协议逻辑跑在哪 | **客户端**（现有 `submit_operation` / pull / baseline 语义迁到 PG SQL） |
| 命名空间 v1 | **单用户单副本**：一个连接串 → 一套 change_log；多设备共享 |
| 鉴权 v1 | **连接串内的库凭据**；无 API Bearer、无账号登录、无设备注册 |
| `device_id` | 仍在 operation 载荷内，仅作 **幂等键** `(device_id, operation_id)`，不作安全边界 |
| 独立 Sync HTTP 服务 | **v1 不做**（个人自备库场景多余；未来若托管多用户可另立任务） |
| Turso / libsql | **替换掉**；非长期路径 |
| 中心共享 SQLite 文件当多端真相 | **否决** |
| 本地也迁到 libsql | **否决** |

### 讨论纪要（2026-07-24 grill）

1. 命名空间：单副本，非多租户、非按 Space 拆流。
2. 曾讨论 HTTPS Sync API + Bearer；产品形态改为用户贴 PG URL 后，**API 层取消**。
3. 「再实现一套同步」误解澄清：协议已有；本任务是 **transport + 远端库类型** 替换，不是重做合并语义。

## 目标形态

```text
┌──────────────── 桌面客户端（主进程） ────────────────┐
│  React / Tauri runtime                               │
│  domain / application                                │
│  storage: SeaORM + sqlx-sqlite → 一份 libsqlite3-sys │
│  本地：stoneflow.sqlite3（唯一业务 writer）           │
│  sync: 协议引擎 + Postgres 驱动（无 libsql）          │
│        设置页：postgresql://... 连接串                │
└──────────────────────────┬───────────────────────────┘
                           │ Postgres wire（TLS 按连接串）
                           │ 多设备可同时连同一库
┌──────────────────────────▼───────────────────────────┐
│  用户自备 PostgreSQL（Neon / 自建 / 其他托管）         │
│  云端副本（非业务库镜像）：                              │
│    sync_schema / upload_acks / change_log /            │
│    entity_state / tombstones                           │
└──────────────────────────────────────────────────────┘
```

### 原则

1. **本地优先**：UI 与领域写只打本地 SQLite；同步失败不阻断主路径。
2. **单业务 writer**：仅本机 SeaORM 写业务表；云端副本 **不**直接充当业务查询库。
3. **协议稳定、传输可换**：待上传 / mutation / LWW / 同步位置语义保留；transport 从 libsql 换为 Postgres。
4. **主进程零 libsql**：`cargo tree -p stoneflow -i libsql` 为空（实现完成后）。
5. **远端是云端副本**：PG 存变更日志与实体状态，不强制镜像完整 Task 关系表。
6. **一份连接串 = 一份个人副本**：权限与网络暴露由用户在库侧自行配置（个人应用假设）。

## 范围

### 做

- 将现有远端 schema 映射为 **PostgreSQL DDL**（见 PG-SCHEMA：`entity_state` / `upload_acks` 等）。
- 客户端 `sync`：`libsql` → **Postgres**；门面 upload / download / health 对齐现语义。
- 设置页：**同步数据库连接**；凭证优先钥匙串，不进 outbox/业务日志明文。
- 移除主进程 `libsql`；消除双 SQLite 链接警告。
- 单设备与双设备协议行为验收；未配置时不同步。
- 文档：A2、sync 常青 DESIGN、本任务归档。

### 不做（本长期任务边界内）

- 不换 SeaORM 为其他 ORM。
- 不实现账号/团队/附件/CRDT/实时协作。
- 不实现独立 Sync HTTP API / Bearer / 设备注册（另立任务若产品变为托管多用户）。
- 不以「共享 SQLite 文件」作多端中枢。
- 不把整库业务文件同步到云端。
- 不要求用户部署除 Postgres 以外的中间服务。

## 与已完成 R0–R9 的关系

| 已完成 | 本任务继承 |
|---|---|
| 领域模型、baseline schema | 本地库不变 |
| outbox 协议语义 | **同一套**；改执行在 PG 上的 SQL |
| 无 Inbox / standalone | 不变 |
| 同进程 libsql → 远端 SQLite | **替换为** 同进程 PG 驱动 → 用户 Postgres |

R0–R9（及总 plan）已归档，见 `Documents/98-归档/02-已完成重构/2026-07-22-backend-wave-r0-r9/`。

## 协议行为（逻辑，与现实现对齐）

协议类型以 `src-tauri/crates/sync/src/protocol.rs` 为准，不因换库而改语义。

### 上传（原 Push）

1. 从本机「待上传」读取未确认 `SyncOperation`。
2. 云端副本事务：查 `sync_upload_acks` → 否则为每个 mutation 分配 `server_seq`、`apply_mutation`、写 `change_log` / `entity_state` / tombstone → 记 ack。
3. 返回 `UploadResult { committed_seq, was_already_applied }`。
4. 本机标记待上传已确认。

### 下载（原 Pull）

1. 携带本机同步位置（`server_seq`）。
2. 若早于云端保留的最小序号 → **位置过期**，改全量同步。
3. 否则按 `server_seq` 增量读 `change_log`（分页约 200）。
4. 本机 application 应用变更并写 SQLite。

### 全量同步（原 Baseline）

- 首次或位置过期：读全部 `entity_state` + `tombstones` + 当前最大 `server_seq`。

### 鉴权与配置

- 粘贴 `postgresql://…`（Neon 与自建同一形态）到 **同步数据库连接**。
- 鉴权 = 库凭据；App 不另造 token。
- 连接/权限错误 → 同步错误，不阻断本地编辑。

## PostgreSQL 表职责（逻辑）

| 表 | 职责 |
|---|---|
| `sync_schema` | 协议版本 |
| `sync_upload_acks` | 上传确认（幂等） |
| `sync_change_log` | 变更日志（`server_seq` = 同步序号） |
| `sync_entity_state` | 实体当前状态 |
| `sync_tombstones` | 删除标记 |
| （可选后续）设备元数据 | v1 不强制；同步位置在 **客户端本地** |

具体 DDL 见 [PG-SCHEMA.md](./PG-SCHEMA.md)；字段映射见 [MAPPING.md](./MAPPING.md)。

## 模块边界（摘要）

完整说明见 [DESIGN.md](./DESIGN.md)。

- **Core**：`protocol` / `error`（无 IO）
- **门面**：`upload_*` / `download_*` / `health`
- **IO**：唯一 `postgres/`（sqlx）；无空 Port 层；删除 libsql
- **本地业务**：SeaORM + SQLite，与云端副本无共享事务
- **KISS**：不预埋多后端、不做 v1 HTTP Sync、远端不用 SeaORM

## 实施阶段

### P0 — 契约与验收门槛（已完成文档）

- 冻结：PG 为唯一远端；连接串配置；无 HTTP Sync API。
- 产出：[DESIGN.md](./DESIGN.md) · [PG-SCHEMA.md](./PG-SCHEMA.md) · [MAPPING.md](./MAPPING.md)
- 字段/表映射、错误模型、CI 无 libsql 草案均已写入 MAPPING。

### P1 — Postgres 云端副本 + schema

- Bootstrap：空库可建表；版本不匹配明确报错。
- 单设备：上传幂等、下载增量、全量同步、entity-gone 等与现测例语义对齐。
- 可用 Neon **或** 本地/容器 Postgres 跑集成测试（同一驱动）。

### P2 — 去 libsql + 设置页

- 替换所有 `libsql` 远端路径。
- 移除 workspace 默认 `libsql` 依赖。
- 设置页：**同步数据库连接**；未配置则不同步。
- 确认链接日志无 `libsql_ffi` 与 sqlite 双符号警告。

### P3 — 双设备与故障

- 两设备：异字段合并、同字段 LWW、删除、批量、重复上传、同步位置过期。
- 连接失败、权限错误、库不可达、重启后重试。
- 性能抽样：baseline vs 单 patch vs 批量（记录实测，不编造）。

### P4 — 硬化与文档

- 更新 A2、sync DESIGN；本任务记偏差后归档。
- 常青表述：**本地 SQLite + SeaORM；同步数据面 = 用户 Postgres；协议在客户端；无 libsql**。

## 退出条件

- [ ] 主进程依赖树无 libsql。
- [ ] 增量同步行为与现协议语义一致（或有文档化偏差）。
- [ ] 双设备核心场景可复现通过。
- [ ] Neon 与自建 PG 至少各验证一种连接形态（或文档说明「标准 Postgres 即可」并有一种实测）。
- [ ] 常青文档描述上述架构。
- [ ] 旧 Turso/libsql 路径删除或默认关闭且无主进程链接。

## 风险

| 风险 | 缓解 |
|---|---|
| SQLite SQL → PG 方言差异（`?` 占位、JSON、UPSERT、序列） | P0 列差异表；P1 单测/集成测锁行为 |
| 多设备并发占 `server_seq` | 事务内取序列；测并发 push |
| 连接串含密钥 | 钥匙串存储；日志脱敏；文档提醒最小权限角色 |
| 用户暴露公网 PG | 文档提示 SSL、IP allowlist、只授同步表权限；个人自负运维 |
| 与旧 Turso 数据 | 硬切允许；用户可新库 bootstrap（与 R9 一致） |
| 以后若要托管多用户 | 另立「Sync API」任务；不预埋复杂多租户 |

## 非目标架构（明确否决）

- 中心共享一个 SQLite 文件给多设备写。
- 本地业务库改走 libsql。
- 为消警告而换掉 SeaORM。
- 整库文件备份当「同步」。
- v1 自建 Sync HTTP 中台 / OAuth / 设备注册（与「用户自备 PG 直连」重复）。
- 客户端把 Postgres 当完整业务库做日常查询（业务仍只读本地 SQLite）。
