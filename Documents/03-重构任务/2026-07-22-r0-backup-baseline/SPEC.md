# R0 备份与基线 - Spec

## 目标

在任何破坏性修改前，保留可恢复数据并建立可比较的质量与同步性能基线。

## 范围

- 备份本地 SQLite 主文件及 WAL/SHM。
- 导出或复制远端 Turso 数据与 schema。
- 记录当前 Rust、前端校验结果和同步四阶段耗时。
- 验证备份可读取，记录恢复步骤与保存位置。

## 不做什么

- 不修改 schema、同步协议、业务代码或前端。
- 不把备份做成产品功能或长期自动任务。

## 当前上下文

- 本地数据库由 `storage::database::resolve_database_path` 从应用数据目录解析；SQLite 可能同时存在主库、`-wal` 与 `-shm` 文件。
- 远端为用户手动配置的 Turso 数据库，旧同步 worker 会维护业务表、mutation ack、change log 与本地 cursor。
- 旧数据允许舍弃，但只有在确认备份可读取后才允许删除旧 schema 或覆盖远端表。

## 实施设计

1. 退出 StoneFlow，确认 SQLite 不再有活跃写入连接。
2. 同时复制主库、WAL 和 SHM 到带时间戳的备份目录；缺失 WAL/SHM 只在确认不存在时允许。
3. 用只读连接执行 `PRAGMA integrity_check`、读取 schema 及关键表计数；将结果写入 R0 完成记录。
4. 通过现有 Turso 配置连接远端，导出 DDL 与数据快照，至少覆盖旧业务表、同步表和 schema 版本信息。
5. 对备份副本执行只读验证，原库不做恢复演练覆盖。
6. 记录重构前性能：一次空闲同步、一次有少量 mutation 的同步，按 worker 启动、push、pull、local apply 分段记录。

## 交付物

- 本地 SQLite 可恢复备份及校验记录。
- 远端 Turso schema/data 导出及校验记录。
- 当前 `cargo`、Bun 校验输出与同步性能基线。
- 不包含 token 的备份位置说明；token 继续仅存在 Keychain/当前安全配置中。

## 退出条件

- 本地与远端备份已验证可读取。
- 当前校验与同步耗时已记录。
- 后续任务可明确以备份后的数据为唯一旧数据回退点。

## 验证

- 备份数据库执行只读健康查询。
- 运行当前根 Bun 与 Rust 基线命令，并保留结果。

## 风险与恢复

- 复制活跃 WAL 可能产生不一致备份，因此必须在应用退出后操作。
- 远端导出不得写入 Git，也不得在任务文档中写 token。
- 后续 R1/R2 失败时，只允许以本任务备份恢复，不尝试把半新半旧 schema 混合运行。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
