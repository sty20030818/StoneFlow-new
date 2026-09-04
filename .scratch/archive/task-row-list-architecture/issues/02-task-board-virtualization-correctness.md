# 02：修正 TaskBoard 虚拟化与 React 热路径

**What to build:** 让 TaskBoard 的滚动高度只表示已加载且真实可到达的内容，以小型 loader sentinel 完成 cursor 分页，并消除滚动热路径中已确认的无效重算与重复查找，使快速滚动、分页、折叠、选择和焦点恢复保持正确且可验证。

**Blocked by:** 01 — 统一 Row 与集合页面契约

**Status:** implemented

- [x] 删除由未加载任务数量生成的巨大 spacer；virtual scroll extent 只包含已加载的真实 header/row 与一个固定小型 loader sentinel，`totalCount` 不再产生可滚动像素。
- [x] loader sentinel 明确区分 idle、loading、error 与 exhausted；进入临界区只允许一个 in-flight fetch，追加后 scroll position 稳定，失败可原位 retry，结束后不再 fetch，也不会连续追取多页。
- [x] 删除只为假 spacer 服务的 extent、`loadedCount`、参数、ref 和 wiring，并同步迁移 Task 数据源、Task Workspace scene、项目详情、Saved View 与 benchmark 编译调用方；仍需保留的值必须有当前消费者和独立语义，并以准确名称存在，不作为兼容壳。
- [x] virtualizer 的 key getter、size estimator、range extractor 与 scroll-element getter 在语义未变时保持稳定 identity，固定高度快路径不引入动态测量或 ResizeObserver。
- [x] TaskBoardGridRow 建立有效 memo 边界；row actions、project binding、Context Menu bulk actions、row state 与 React Aria props 在语义未变时保持稳定，随后删除不再产生收益的深 comparator 分支，不向全树扩散无依据 memo。
- [x] 每次 collection projection 一次构建 key-to-ordinal Map，mounted Row 不再重复线性 `indexOf`；新增回归能证明无关 parent/range 更新不会重新执行语义未变的昂贵 Row Adapter。
- [x] 删除未使用 measure ref、显式无效配置、virtualItems 为空时渲染全部 flatItems 的 fallback，以及搜索确认零消费者的半条 scroll bridge；保留详情关闭后按 stable id 返回原 Row 的产品焦点合同。
- [x] overscan 保持 6；sticky overlay、单实例 sticky 与 virtual row 的 `content-visibility` 不在本 ticket 凭静态偏好改写，只作为 Ticket 03 的同条件测量变量。
- [x] React Aria/React Stately 继续是 selection/focus 唯一事实源；分页未结束时使用 `aria-rowcount=-1` 并通过可访问 status 报告“已加载/总数”，全部加载后报告当前 navigable row count，row index 与折叠后的稳定可导航顺序一致。
- [x] taskBoardModel 测试覆盖 fixed geometry、loaded-only extent、单一 sentinel、`totalCount` 不改变 scroll height、page append、折叠和 key-to-ordinal；TaskBoard 集成测试覆盖单次 fetch、retry、exhausted、J/K/Arrow、range selection 不跨 header、Context Menu 与详情焦点恢复。
- [x] 以修正后的生产虚拟路径建立 Ticket 03 可直接测量的可复核实现基线，但不在生产加入 ordinary renderer、threshold switch 或 feature flag；性能 harness 的完整修复、实机采集和跨引擎比较留给 Ticket 03。
- [x] 同步系统设计、界面系统、HeroUI 平台 ADR 与相关模块架构中关于服务端 spacer、总高度、分页 ARIA 和当前虚拟路径的事实，保证 Ticket 02 单独完成时文档不描述已删除行为。
- [x] 搜索确认旧 extent/spacer 形状、dead refs、全量 fallback、失效参数和兼容测试清零；无调试日志、任意 sleep、放宽断言、跳过测试或新增依赖。
- [x] 聚焦测试通过后，运行根级 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun test:run`、`bun run test:scripts`、`bun run test:release`、`bun run build` 与 `git diff --check`；自动化只证明正确性与回归，不宣称真实 WebView 跟手性通过。
