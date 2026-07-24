# 本地优先同步平台（长期）- Tasks

## 当前阶段

**P0 契约已按推荐命名/边界修订；实现未开始（P1）。**

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

- [ ] `stoneflow_sync`：`postgres/`（sqlx）+ 门面 `upload_*` / `download_*` / `health`
- [ ] `ensure_ready` bootstrap（PG-SCHEMA）；版本不兼容拒绝
- [ ] 单设备：上传幂等、下载分页、全量、删除标记 / entity-gone
- [ ] 集成测：容器 Postgres 和/或 Neon；**无 libsql 测例**
- [ ] `apply_mutation` 仅 protocol 一处；postgres 上传事务内调用

## P2 — 去 libsql + 设置

- [ ] `SyncRemoteConfig { database_url }`；删 token
- [ ] 移除 libsql 依赖与路径
- [ ] 设置页：「同步数据库连接」；钥匙串 + 日志脱敏
- [ ] CI：依赖树无 libsql；无双 sqlite 链接警告

## P3 — 双设备与恢复

- [ ] 两设备：异字段合并、同字段 LWW、删除、批量、重复上传、同步位置过期
- [ ] 库不可达 / 认证失败 / 重启重试
- [ ] 性能抽样（记录实测）

## P4 — 文档与收尾

- [ ] 更新 A2、sync 常青 DESIGN
- [ ] 本任务归档；`_INDEX` 更新

## 遗留自 R7/R10

- 真实双设备与性能证据
- 消除 libsql 双链警告

## 完成记录

- 规格初版：2026-07-24（Sync API 路径，已废弃）
- 规格修订：2026-07-24 — 直连用户 Postgres
- P0 契约：2026-07-24
- P0 命名/边界修订：2026-07-24 — 白话词汇、entity_state/upload_acks、无空 Port 层
- 实现：未开始
