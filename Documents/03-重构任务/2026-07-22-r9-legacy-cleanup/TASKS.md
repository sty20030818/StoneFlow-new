# R9 旧链路清理 - Tasks

## 当前阶段

未开始。依赖 R8；本任务只删除已经由新实现替代的旧链路，不以“清理”为名引入新的架构改动。

## 阶段一：建立旧入口与替代 Owner 清单

目标：先证明每个待删对象确实无生产职责，防止删掉未迁移的能力。

- [ ] 从 Cargo metadata、Tauri config、command registry、前端 API facade 和测试入口建立旧路径清单。
- [ ] 搜索旧 crate、worker、CLI、snapshot、Inbox/Focus、complete/reopen、兼容 DTO 与 raw connection escape hatch。
- [ ] 为每个待删项记录新的 Owner、替代证据或明确标记为死代码；没有替代证据的项目不得删除。
- [ ] 将用户数据备份和 R0 验证结果作为删除前置条件，而不是在本任务重新导出数据。

验收：待删清单可追溯到替代实现；没有仅凭名称猜测的删除项。

## 阶段二：删除 Rust 与同步旧链路

目标：结束新旧后端并存，缩小长期维护和安全面。

- [ ] 删除旧 Rust crate、sync-worker/sidecar、stdout JSON、旧 schema/migration、compat adapter 与无调用 repository。
- [ ] 删除旧同步 snapshot/全量路径、worker path lookup、externalBin、过时 capability 和无用依赖。
- [ ] 删除 raw connection 逃生通道，确保数据库访问通过 storage/application 已确认边界。
- [ ] 运行 Cargo metadata 和全仓检索，确保旧 crate、命令、feature flag 与配置没有残留。

验收：Rust workspace、Tauri bundle 配置和运行时不再可启动旧同步/数据路径。

## 阶段三：删除前端兼容与测试残留

目标：使 UI 和测试只描述当前产品模型，避免旧概念继续影响新功能。

- [ ] 删除旧前端 invoke、DTO、Query/store、fixture 和兼容 UI 分支。
- [ ] 删除 Focus/Inbox、complete/reopen、旧 status 和旧快速创建文案的残留。
- [ ] 更新或删除仅链接旧实现的测试、mock 和开发工具说明；保留测试价值而不是机械删测试。
- [ ] 检查死导出、未使用依赖和不再可达的路由/command。

验收：前端不再包含旧产品术语或调用合同；测试只覆盖当前契约。

## 阶段四：文档与构建收口

目标：确保未来开发者和 AI 不会根据过期资料重建已删除的设计。

- [ ] 将旧实现链接从常青文档删除或替换为当前 Owner；历史任务仅在归档中保留，不作为操作说明。
- [ ] 运行全仓检索、Cargo metadata、fmt、严格 Clippy、workspace tests、Bun typecheck/lint/format。
- [ ] 对每个删除项记录新 Owner 或验证证据，无法验证的项留在完成记录而不声称已清理。

验收：构建与校验通过；常青文档没有指向废弃生产路径；删除证据完整。

## 阻塞

- R8 未完成。
- 若某旧路径仍承担未迁移的用户可见行为，先回到对应 R1-R8 任务完成迁移，不在这里保留长期兼容层。

## 与 SPEC 的实施偏差

无。

## 完成记录

- 完成日期：
- 删除清单与替代证据：
- 已更新的长期文档：
- 遗留技术债：
