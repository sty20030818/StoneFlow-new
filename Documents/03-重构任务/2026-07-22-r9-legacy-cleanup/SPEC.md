# R9 旧链路清理 - Spec

## 目标

在新功能路径稳定后，删除所有旧模型、兼容桥、冗余依赖、失效测试和过时配置，确保仓库只保留一个实现真相。

## 范围

- 删除旧 schema、repository、DTO、commands、sync sidecar、兼容转换和无调用代码。
- 删除不再使用的 Cargo/前端依赖、权限、打包配置和测试 fixture。
- 检索旧术语与旧模型，确认无生产引用。

## 不做什么

- 不为旧数据库或旧协议提供迁移兼容。
- 不顺手清理与本重构无关的产品功能。

## 当前上下文

- 破坏性重构最常见失败方式不是新路径不能运行，而是旧 command、旧 schema、旧 payload 或旧依赖仍可被调用。
- R1-R8 为保持阶段可编译可能暂时留下桥接入口；R9 是唯一允许集中删除这些过渡物的阶段。

## 清理清单

- Cargo：旧 crate member、libsql sidecar features、无引用依赖、旧 binary/package metadata。
- Rust：旧 `TaskStatus`、complete/reopen、Inbox/Focus、runtime services、raw connection escape hatch、snapshot payload、旧同步 shadow 与 CLI parsing。
- 前端：旧 invoke 名、DTO、Query keys、旧 store state、二态状态 UI、兼容转换与无效测试 fixture。
- Tauri：externalBin、过时 capability、worker 路径查找、旧日志 target。
- 文档：指向旧 crate/worker/schema 的当前链接；历史记录只归档，不改写。

## 实施设计

1. 先从 Cargo metadata、command registration、前端 facade 和打包配置建立旧符号清单。
2. 每删除一条旧路径，都以新路径已有覆盖为前提；不删除尚被 R10 验证使用的工具。
3. 使用全仓检索确认命名残留，再运行编译与测试，而不是只依赖人工目录检查。
4. 清理只删除重构造成的兼容层，不纳入无关格式化或 UI 改造。

## 退出条件

- 旧 API、旧 crate、旧同步协议和兼容层无生产残留。
- Cargo 依赖图、前端调用和文档引用均指向新实现。

## 验证

- 全仓检索、Cargo metadata、前端 typecheck/lint 与 Rust workspace 校验。

## 风险

- 删除顺序错误会掩盖尚未迁移的调用方；因此 R9 不能提前到 R8 前执行。
- 历史归档文件出现旧术语是正常的，检索规则必须限定生产代码和当前文档。

## 关联

- [总重构 Spec](../2026-07-22-backend-rearchitecture/SPEC.md)
- [R8 Runtime 与 Platform](../2026-07-22-r8-runtime-platform/SPEC.md)
