# 后端重构波次 R0–R9（已归档）

## 结论

2026-07-22 启动的后端架构与本地优先同步重构主线（R0–R9）**功能实现已收口**，目录整体归档。  
**不作为当前运行规则来源**；当前真相见常青文档与代码。

## 包含目录

| 目录 | 主题 |
|---|---|
| `2026-07-22-backend-rearchitecture` | 总 Spec |
| `r0`–`r9` | 备份、边界、domain/storage、Space/Project/Task、View、Sync、Runtime、清理 |
| `r10-verification-docs` | 原定全量验证与归档（未单独完整执行；文档对齐与代码清理已在 R9 后续完成一部分） |

## 已落地（摘要）

- Workspace：`domain / application / storage / sync / platform / runtime`
- 单一 SQLite baseline；无 Inbox；Task 归属 project \| standalone
- 同进程 outbox 同步（libsql → Turso）——**长期将被「客户端直连用户 Postgres」替换**
- 前端 hard-cut standalone

## 未并入本归档、转入新活跃任务

见：[`Documents/03-重构任务/2026-07-24-local-first-sync-platform/`](../../../03-重构任务/2026-07-24-local-first-sync-platform/SPEC.md)

- 去掉主进程 libsql / 双 SQLite 链接
- 同步数据面：用户自备 PostgreSQL（Neon/自建同一路径），客户端直连
- 双设备真实环境验证与性能证据

## 历史遗留（归档时已知）

- R4：部分 Project WorkState/排序测试覆盖未满
- R7 阶段五：双设备与性能基线未完整采集
- R0：部分工程校验基线未测
- R10：清单式全量验收未完整勾选

以上不阻塞「主线实现已完成」的归档判断；开放项进入新长期任务或技术债。
