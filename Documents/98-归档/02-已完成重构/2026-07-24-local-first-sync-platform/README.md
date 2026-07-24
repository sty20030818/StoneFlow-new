# 本地优先同步平台（已归档）

## 结论

2026-07-24 启动的「本地优先同步平台」任务：**单设备主路径（P0–P2.1 + P4）已完成**，目录归档。  
**不作为当前运行规则来源**；当前真相见常青文档与代码。

## 已落地

- 云端副本 = 用户自备 PostgreSQL（Neon / 自建同一路径）；客户端 sqlx 直连
- 主进程 **无 libsql**；协议在 `stoneflow-sync`（`protocol` + `postgres/`）
- runtime：outbox 上传、cursor 下载、origin seed / adopt、协议文档预热、按 mutation 语义物化
- 设置页：同步数据库连接串；钥匙串存完整 URL
- 字段级 LWW、lifecycle、tombstone；增量为主，全量仅首次 / 位置过期

## 明确延期（P3）

- 双设备合并 / LWW / 删除 / 位置过期实测
- 库不可达、认证失败、重启重试体验证据
- 性能抽样
- 有库时跑 `#[ignore]` Postgres 集成测

以上可另开任务，不阻塞本波关闭。

## 目录

| 文件 | 内容 |
|---|---|
| `SPEC.md` | 目标与边界 |
| `TASKS.md` | 执行勾选与完成记录 |
| `DESIGN.md` / `PG-SCHEMA.md` / `MAPPING.md` | 契约与映射 |
| `SYNC-MODEL.md` / `BOOTSTRAP.md` | 模型与引导说明 |

## 当前真相入口

- [A2 系统设计 · 云同步](../../../01-架构/A2-系统设计.md#云同步)
- `src-tauri/crates/sync/`
- `src-tauri/crates/runtime/src/sync/`
- `src/features/sync/`
