# 本地优先同步平台（长期）- Tasks

## 当前阶段

**单设备主路径已完成并归档；P3 双设备延期。**

依赖：R0–R9 后端波次已完成并归档。

## 决策锁定

- [x] 本地：SQLite + **SeaORM**（不换 ORM）
- [x] 云端副本：用户自备 **PostgreSQL**（Neon / 自建 **同一路径**）
- [x] 客户端直连 PG；协议在客户端；**无 libsql**；无 v1 HTTP Sync
- [x] 鉴权：连接串；配置字段仅 `database_url`
- [x] 单用户单副本
- [x] 模块：`protocol`（纯）+ 门面 upload/download + **`postgres/` 唯一 IO**；**无**空 Port 层 / `RemoteSyncStore`
- [x] 表名：`sync_entity_state`、`sync_upload_acks`；时间列 TEXT RFC3339
- [x] 对外词汇：待上传 / 上传 / 下载 / 同步位置 / 全量同步 / 云端副本

## P0 — 契约

- [x] `DESIGN.md`（词汇表 + 扁平模块 + 门面语义）
- [x] `PG-SCHEMA.md`（DDL 与表名）
- [x] `MAPPING.md`（映射 / 方言 / 错误 / CI）
- [x] SPEC / TASKS 对齐

## P1 — Postgres 云端副本

- [x] `stoneflow_sync`：`postgres/`（sqlx）+ 门面 `upload_operations` / `download_after` / `download_full` / `health` / `diagnose_cloud`
- [x] `ensure_ready` bootstrap（`entity_state` / `upload_acks` 等）；版本不兼容拒绝
- [x] 单设备语义实现：上传幂等、下载分页、全量、删除标记 / entity-gone
- [x] 集成测：`#[ignore]`，需 `STONEFLOW_SYNC_DATABASE_URL` 或 `DATABASE_URL` 后 `-- --ignored` 实跑
- [x] `apply_mutation` 仅 protocol 一处；postgres 上传事务内调用
- [ ] 用真实 Neon/本地 PG 跑一遍 ignored 测例并勾选（环境有库时）— **延期**

## P2 — 去 libsql + 设置

- [x] runtime：`SyncRemoteConfig { database_url }`；`ConfigureSyncInput.database_url`
- [x] outbox → `upload_operations`；pull → `download_after` / `download_full`
- [x] 删除 sync 内 libsql 模块与 workspace `libsql` 依赖
- [x] 设置页：「同步数据库连接」；钥匙串存完整连接串；UI/日志脱敏
- [x] 主进程依赖树无 libsql；硬切完成

## P2.1 — 协议物化契约（根因修复）

- [x] origin-adopt / 冷协议：业务表预热完整 `sync_protocol_entities` 文档
- [x] pull 物化按 mutation 语义：Tombstone / Lifecycle / Patch，禁止残缺 snapshot 全量 UPSERT
- [x] 去掉业务表 reverse-hydrate 作为主路径

## P3 — 双设备与恢复（延期）

- [ ] 两设备：异字段合并、同字段 LWW、删除、批量、重复上传、同步位置过期
- [ ] 库不可达 / 认证失败 / 重启重试
- [ ] 性能抽样（记录实测）

> 明确不阻塞本波归档；新任务再开时从此清单继承。

## P4 — 文档与收尾

- [x] 更新 A2、sync 常青 DESIGN / README（Postgres 为当前真相）
- [x] 本任务归档；`_INDEX` 更新

## 遗留（归档后）

- P3：真实双设备与性能证据
- P1 勾选项：有 PG 时跑 ignored 集成测

## 完成记录

- 规格初版：2026-07-24（Sync API 路径，已废弃）
- 规格修订：2026-07-24 — 直连用户 Postgres
- P0 契约：2026-07-24
- P0 命名/边界修订：2026-07-24
- P1 代码：2026-07-24 — `postgres/` + 门面 API
- P2 代码：2026-07-24 — runtime 切上传/下载；移除 libsql；设置页连接串
- P2.1：2026-07-24 — 协议预热 + 语义物化
- 依赖清理：SeaORM 2 / sqlx 0.9 / keyring 4；去掉 pnpm 与 proc-macro-error2 patch
- **P4 归档：2026-07-24** — 单设备主路径关闭；P3 延期
