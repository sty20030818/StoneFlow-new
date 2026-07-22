# R10 全量验证与常青文档 - Tasks

## 当前阶段

未开始。依赖 R9；本任务只在所有功能迁移和旧链路清理完成后进行，不能用文档收尾替代未完成实现。

## 阶段一：工程质量与依赖边界验证

目标：验证工作区可以作为一个完整产品构建，而不只是各任务的局部测试通过。

- [ ] 运行 `cargo fmt --check`、严格 Clippy、Rust workspace tests 和定向 integration tests。
- [ ] 运行 Bun typecheck、lint、format check 和受影响前端测试。
- [ ] 审计依赖方向：domain/application/storage/sync 不依赖 Tauri；runtime command 不访问 repository/SQL/sync concrete type。
- [ ] 审计旧路径、废弃 crate、兼容 DTO、敏感日志和 Tauri command registry。

验收：所有约定的根校验通过，或每个无法通过项有可复现、与本重构无关的证据。

## 阶段二：核心产品链路验收

目标：从用户可见行为验证新模型，而不是只检查 API 单元测试。

- [ ] 演练 Space 创建、默认切换、归档/删除/恢复以及关联 Project/Task 的管理动作。
- [ ] 演练 Project/Task 的状态、优先级、planned/due/remind、排序、归属与批量操作。
- [ ] 演练 Task Activity、链接、物理删除和短时恢复接口的契约。
- [ ] 演练 All Tasks、系统 View、自定义 View、URL filter 和记忆筛选的查询语义。
- [ ] 验证 Launcher 与主应用创建任务使用相同后端规则。

验收：产品核心链路符合已确认产品定义；每个异常边界有用户可理解的错误或拒绝结果。

## 阶段三：同步、故障恢复与性能验收

目标：证明“无感后台同步”在真实竞争、离线和恢复场景中正确且足够快。

- [ ] 用两个本地库/设备 ID 演练首次 baseline、cursor delta、不同字段合并、同字段 LWW、批量 operation 和重复请求。
- [ ] 演练长期离线设备上的删除、tombstone、stale patch 拒绝、cursor 过期与 full baseline。
- [ ] 演练鉴权失败、schema 不兼容、网络退避、应用重启和手动重试状态。
- [ ] 聚合 tracing phase 耗时、payload、change count，与 R0 同步基线比较。
- [ ] 若性能未达秒级正常同步目标，按数据定位问题，不以新增并行 push/pull 或复杂队列掩盖问题。

验收：两设备语义正确、失败可恢复、正常增量同步有可复现性能证据。

## 阶段四：常青文档与归档收口

目标：让最终文档只描述当前实现，历史计划不再作为下一次改动的真相源。

- [ ] 更新根架构、`src-tauri` 架构、A1/A2 与受影响模块 README/ARCHITECTURE/DESIGN。
- [ ] 确认每条事实只存在一个 Owner：产品模型、系统边界、同步协议、模块入口和任务执行历史不互相复制。
- [ ] 将实际偏差、未验证项和遗留债务写入各任务完成记录，不能静默省略。
- [ ] 从 `_INDEX.md` 移除活跃任务，将 R0-R10 与总计划移入 `Documents/98-归档/`。
- [ ] 归档前复查链接有效性，确保常青文档不依赖已归档任务才能理解当前系统。

验收：常青文档与代码一致；历史任务已归档且不承担运行规则；索引只指向当前工作。

## 阻塞

- R9 未完成。
- 任何关键验收失败都必须回流到对应 R0-R9 任务修复，而不是在完成记录中简单标注“已知问题”。

## 与 SPEC 的实施偏差

无。

## 完成记录

- 完成日期：
- 验证命令及结果：
- 已更新的长期文档：
- 未验证项与原因：
- 遗留技术债：
