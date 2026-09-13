# 06 主分组统一排序、折叠与选择：实施与验证

日期：2026-09-13。状态：`implemented-awaiting-acceptance`。

前置 05 已按本轮授权提交为 `ca0d9655 fix(views): 统一完整结果排序与稳定分页`，提交后工作区干净；06 改动保持未暂存，未推送。

## 已实现

- `order.groupBy` 进入 Default/Saved 的共同查询、Query key 与 cursor v2。状态固定业务序、优先级 4→0、项目名称 BINARY/ID/独立事项最后、截止和计划日期的六个互斥桶，均在 SQL 截页前作为总序前缀执行。
- 主组顺序独立于组内方向；natural/recency 沿用 05，done 只在本组内置底。日期桶使用 cursor 冻结的 UTC 边界和 05 精确日期表达式。
- 查询输出 `TaskQueryItem.group`，保留通用 `TaskListItem`。后端生成实际语义身份，Display 只生成稳定 key、中文标题、已加载成员和可选状态动作元数据，不在前端重新分类日期或排序项目。
- 删除 `boardPatch/customSections/statusOrder` 双轨、状态二次 regroup、空 apply context 及无消费者的 `taskBoardOrder` 模块。唯一 sections 沿既有 CollectionBody、flat items、sticky、sentinel 和 append anchor 执行。
- 组头保留 `header.tasks` 的全部已加载成员，折叠仅隐藏行；所有实际主组均能折叠、展开、选择成员。菜单依据非空组是否全部已选，修正单成员组取消选择及部分组选中后的补选，并迁移 Project/Lifecycle 共享菜单调用。
- 状态仅提供图标和创建预填，创建仍携带页面项目；非状态组不从标签猜测或写入任务属性。
- 折叠按 Default 的 scope/context/baseViewKey 或 Saved 的 scope/viewId，再加 groupBy 持久化。筛选、排序和日期重读保留同来源偏好，切换来源或分组不会串用。旧全局状态组偏好缺少来源，保留旧 key、不复制到新偏好，首次默认展开。
- 删除批次与待消费焦点意图绑定完整查询窗口 `sourceKey`；新窗口首次提交就不暴露旧意图，丢弃旧删除恢复，避免删除刷新未完成时切换 View 拉动新页面焦点。

## 回归证据

- 真实 SQLite 337 条任务：5 种主组 × 4 种组内叶序 × natural/recency，共 40 种组合，每种跨 3 页；逐行对照独立产品比较器和组身份，验证无重复/遗漏、同组跨页合并、不会回到已完成的前序组、组内 recency。
- 项目样本覆盖同名、大小写、补充平面 Unicode 与独立事项；日期样本覆盖 NULL、纳秒日界线和周末，application 与 SQL 分类一致。05 的 44 组真实跨页排序回归继续通过。
- 真实 Project 页面使用 Router、Query、生产 Display/scene/TaskBoard，仅替代 Tauri IPC 和 jsdom viewport 几何。状态与优先级两个场景均验证：续页未返回时折叠并选中首屏成员；续页失败原位重试同 cursor；同组追加只有一个组头；新成员不自动被选中，组菜单可补选；其他组不被选中。
- 同一真实页面验证 Default 全部/未完成来源隔离、切换分组隔离、重新创建 QueryClient/页面后偏好恢复。预览入口通过薄壳接真实 controller/Card/详情查询，关闭后稳定任务焦点、焦点框与选择恢复；没有替换生产列表或用 hook 模拟查询页面。
- 两条跨窗口焦点回归先失败：旧删除批次把新窗口焦点移到首条，旧 group-trigger 在新窗口首次提交仍可见；绑定完整窗口身份后通过。原有删除批次、折叠焦点、预览测试保留。
- Board 4 个测试文件共 33 项通过，保留真实菜单焦点、几何、虚拟化、sticky、续页锚点和键盘回归；catalog 31 项通过。API/query/Display 聚焦 6 文件 30 项通过，恢复/管理/保存 3 文件 18 项通过。
- 夹具迁移中确认 `ViewRecovery` 的非空查询结果缺少 group 导致真实页面失败，修复边界夹具后原恢复断言通过。预览页面新增键盘滚动路径所需 clientHeight 几何，未忽略 jsdom 的未处理错误。

## 全仓门禁

- Rust workspace：292 项通过，12 项依赖外部 PostgreSQL 的既有测试按条件忽略；`cargo fmt --all -- --check` 通过。
- `bun run test:run`：219 个文件、1302 项测试通过。末次焦点清理调整后，相关集合与真实页面 2 文件、26 项再次通过。
- `bun run test:release`：14 个文件、153 项通过，仅验证发布逻辑，未执行发布。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run check:animations`、`bun run format:check` 与 `git diff --check` 通过；末次 lint 无警告。
- 根格式化覆盖 950 个匹配文件；旧状态排序模块及其测试删除，因此测试文件数比 05 减少 1，总测试数增加 9。暂存区为空。

## 验收边界

- 本轮没有启动开发服务或原生 StoneFlow，没有修改正式数据库或发布。页面与 SQLite 集成测试证明执行和交互，不代替 09 的实际 Tauri 现场验收。
- 子分组与精确空组摘要按已批准规格留给 07/08；本票仅展示已加载的实际非空主组，不按 totalCount 制造未加载高度。
- 不提供跨并发写入快照。项目重命名沿既有 mutation 失效 tasks/views 并重新读取窗口；SQL 排序与随后批量名称读取之间的并发写入不宣称为同一快照。
- 未新增依赖、数据库 schema/wire 迁移、第二执行器、renderer 或分组框架。Board、Display、ShellPreference 与 A2/A3 权威文档已同步。
