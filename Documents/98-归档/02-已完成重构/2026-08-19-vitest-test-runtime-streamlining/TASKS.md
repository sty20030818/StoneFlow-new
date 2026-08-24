# Vitest 前端测试系统精简 - Tasks

## 当前阶段

**已完成并归档** — T1–T17 的运行时分流、全仓语义 hard cut、console 门禁、三轮基准与长期文档已经收口；后续 HeroUI 阶段也已完成。

## 阶段任务

- [x] T1 使用临时 Vitest 配置验证 `node` / `jsdom` projects 的继承、互斥 include/exclude、project 过滤与当前 201 个测试文件完整覆盖，并记录分类例外与基准命令。
  - _对应验收标准：AC-1, AC-2_

- [x] T2 修改 `vitest.config.ts` 与 `src/test/setup.ts`，落地互斥的 Node/DOM projects，仅 DOM project 加载 setup，并删除重复的 Testing Library cleanup 与 Vitest mock restore。
  - _对应验收标准：AC-1, AC-2_

- [x] T3 修改 `package.json`，增加直接调用 Vitest project 过滤的 Node/DOM 快速命令，并用 `test:scripts` 完整发现 Bun 脚本测试；保持 `test:run` 与 `check` 为完整门禁。
  - _对应验收标准：AC-1, AC-2, AC-11_

- [x] T4 修改已定位的慢测试，移除消费者 mock 复制的真实 debounce、无消费 Provider 与无必要的 `importOriginal`；回退无收益的 HeroUI 批量子路径试验。
  - _对应验收标准：AC-3, AC-6_

- [x] T5 连续运行两个 project、根级静态门禁与三轮无缓存全量测试，记录正确性、文件/测试数、耗时波动和保留/回退决定。
  - _对应验收标准：AC-1, AC-2, AC-12_

- [x] T6 更新 `Documents/_INDEX.md` 与 HeroUI 原任务 `TASKS.md`，记录第一阶段结果及阶段 K 暂停状态。
  - _对应验收标准：AC-11, AC-12_

- [x] T7 删除或重写 `src/features/global-search/model/searchNavigation.test.ts`、`src/features/view/api/viewSearch.test.ts`、`src/features/task/testing/taskBoardPerformanceFixtures.test.ts` 与 `src/features/filter/model/useListFilterSession.test.ts` 中不调用生产代码、只测委托或只测 fixture 的 Node 用例。
  - _对应验收标准：AC-3, AC-4, AC-5, AC-10_
  - _测试先行：`bun run test:unit`_

- [x] T8 将 `src/features/{task,project,lifecycle}/bulk/*.bulk-actions.test.ts`、通用 selection、update presentation 与 command adapter 的重复状态合同收敛到所属 core/selection/model owner，并删除零消费者兼容测试入口。
  - _对应验收标准：AC-3, AC-4, AC-6, AC-10_
  - _测试先行：相关 Node 测试、`bun run test:unit`、`bun run test:run`_

- [x] T9 精简 `src/features/command/adapters/bind-shell-command.test.ts`、`src/features/command/components/command-menu-model.test.ts`、`src/features/task/commands/taskBulkCommandHandlers.test.ts` 与 `src/layout/config.test.ts` 的 mock 次数、顺序和重复目录断言，只保留各自独立协议。
  - _对应验收标准：AC-3, AC-4, AC-6, AC-10_
  - _测试先行：相关 Node 测试、`bun run test:unit`、`bun run test:run`_

- [x] T10 收敛 `src/features/command/components/CommandMenu.test.tsx`、`src/features/task/components/TaskBoard.test.tsx`、`TaskRowAdapter.test.tsx`、`TaskCreateContent.test.tsx` 与 metadata 测试，使纯规则进入 Node owner、DOM 仅保留 shell/提交/接线行为。
  - _对应验收标准：AC-3, AC-4, AC-6, AC-10_
  - _测试先行：相关 Node/DOM 测试、`bun run test:dom`、`bun run test:run`_

- [x] T11 删除 `src/features/selection/components/CollectionInteractionContract.test.tsx`、无独立行为的 ProjectOverview/TaskPreview 测试，并把 FilterBar、GlobalSearchResults、CustomDateDialog、TaskLinkRow 与 TaskPropertiesSection 的重复合同并入唯一 owner。
  - _对应验收标准：AC-3, AC-5, AC-10_
  - _测试先行：相关 owner 测试、`bun run test:dom`、`bun run test:run`_

- [x] T12 修改 `src/test/setup.ts` 与 `src/test/renderWithRouter.tsx`，让媒体查询默认保守、交互 Provider 显式 opt-in，局部 QueryClient 不启动测试无用的 GC timer，并修复调用方未等待异步 helper 的泄漏；`TestInteractionProviders` 继续复用不可变 registry/runtime，不新增隔离框架。
  - _对应验收标准：AC-6, AC-7, AC-8, AC-10_
  - _测试先行：受影响 router/layout/feature 测试、`bun run test:dom`_

- [x] T13 收敛 `src/features/launcher/**`、`src/features/settings/**`、`src/layout/**` 中 LauncherPage、SettingsPage、ShellSidebar 及共享 Tooltip/Overlay 的重复行为，修复丢失 props/ref 的 test double，保留关键 route、submit、focus 与危险操作合同。
  - _对应验收标准：AC-3, AC-6, AC-7, AC-10_
  - _测试先行：相关 DOM 测试、`bun run test:dom`、`bun run test:run`_

- [x] T14 删除 `src/test/HeroUIMotionContract.test.tsx`、`src/routes/-router-feedback.test.tsx`、`src/shared/components/row/cells/SharedRowCells.test.tsx`，并把 `src/routes/-task-board-benchmark.test.tsx` 的纯访问/loader 规则迁入 Node owner、真实 Board 装配移出默认 Vitest suite。
  - _对应验收标准：AC-4, AC-5, AC-10_
  - _测试先行：相关 Node/DOM 测试、`bun run test:run`_

- [x] T15 清除生产 debug 输出、未处理 React 更新与预期失败噪声，在最小 setup 入口建立覆盖收集、用例和文件收尾阶段的未知 `console.warn` / `console.error` 失败门禁，并让预期输出由具体测试局部 spy 与精确次数断言。
  - _对应验收标准：AC-7, AC-8, AC-9_
  - _测试先行：先验证已知预期输出，再运行 `bun run test:dom` 与 `bun run test:run`_

- [x] T16 连续运行 `bun run test:unit`、`bun run test:dom` 与三轮 `bun run test:run`，再执行 typecheck、lint、feature boundaries、format check；记录最终文件/测试数、中位数、警告状态和未自动验证的 Tauri 冒烟边界。
  - _对应验收标准：AC-1, AC-2, AC-9, AC-10, AC-11, AC-12_

- [x] T17 更新本目录三份文档、根 `ARCHITECTURE.md`、`Documents/_INDEX.md` 与 HeroUI `TASKS.md`，逐条核对 Definition of Done 与 AC-1–AC-12 后恢复或继续暂停阶段 K。
  - _对应验收标准：AC-1, AC-10, AC-11, AC-12_

## 阻塞

- 无。

## 与 SPEC/PLAN 的实施偏差

- 2026-08-19：第一阶段原方案明确“不在阶段 K 前全仓删除、合并测试”。运行时分流完成后，任务发起人要求逐一审计全部测试，并在 grill 决策中确认暂停阶段 K、采用一个行为一个 owner、按 Node → 业务 DOM → 平台 DOM 三批破坏性 hard cut。因此重新打开本任务，扩展 SPEC/PLAN 并增加 T7–T17；T1–T6 的完成事实保留不改写。
- 2026-08-19：任务发起人明确主要目标是测试提速，并认为大面积 HeroUI 子路径导入降低可读性。试验性子路径改写和为此新增的 production presentation 入口已回退；没有隔离 A/B 收益证据，不将其纳入第二阶段。

## 完成记录

- 2026-08-19：第一阶段分类实跑确认 `unit` 为 81 文件/443 项，`dom` 为 120 文件/615 项，合计 201 文件/1058 项，互斥且无遗漏。`unit` 样本为 11.24–16.25 秒。
- 2026-08-19：runner 对照中，默认 `forks` + 自动 workers 优于 `maxWorkers=4`（100.18s）、`threads`（97.41s）与 project 串行（91.67s）；不固化这些较慢参数。
- 2026-08-19：第一阶段最终三次无缓存全量为 87.73s、90.72s、96.97s，中位数 90.72s，均为 201 文件/1058 项通过；typecheck、lint、feature boundaries 与 format check 通过。
- 2026-08-19：完成 201/201 文件语义审计。文件级初始分类为 KEEP 114、REWRITE 63、MERGE 15、DELETE 9；该分类是实施导航，不是测试数量配额。
- 2026-08-19：任务发起人确认不新增真实浏览器 runner、直接删除纯供应商契约测试、不设删减比例，以风险覆盖、零未知警告与实测提速作为第二阶段验收。
- 2026-08-19：完成 T7–T15。Node、业务 DOM 与平台 DOM 三批 hard cut 将重复消费者合同、纯供应商/透传/fixture 自测与实现细节退出默认门禁；通用 selection 与 bulk result 回到所属 core owner，router helper 改为交互 Provider 显式 opt-in，未知 `console.warn` / `console.error` 建立全文件生命周期失败门禁。门禁暴露的异步更新、focus、Provider 与错误 test double 均在具体测试修复，没有白名单或静音。
- 2026-08-19：完成 T16。最终完整 886 项中 886 项通过；末轮终审将 Launcher Space/连续创建/Escape、CommandMenu 自定义日期、Settings 同步刷新失败与 ShellSidebar Space 创建/编辑接线补回唯一 owner。测试代码由 29,404 行降至 24,076 行（-18.12%）；`unit` 为 81 文件/443 项、11.34 秒，`dom` 为 106 文件/443 项、40.76 秒，Bun `test:scripts` 为 16 文件/150 项、22.73 秒。最终全量 187 文件/886 项三轮为 51.28、54.11、57.00 秒，中位数 54.11 秒，较旧中位数 90.72 秒下降 40.35%。typecheck、lint、feature boundaries、format check、动画扫描与 `git diff --check` 通过。
- 2026-08-19：日常路径实测：直接 Node owner 为 69ms，窄依赖 `related` 为 2 文件/11 项、3.66 秒。共享 filter 源文件的 `related` 会沿 barrel 扇出到 70 文件，不能当固定秒级 SLA；长期顺序定为直接 owner/watch → 窄 related → 单 project → 阶段全量。
- 2026-08-19：完成 T17。测试架构同步到根 `ARCHITECTURE.md`、本任务 SPEC/PLAN/TASKS、文档索引与 HeroUI TASKS；阶段 K 的暂停条件解除但未自动开始。没有执行真实 Tauri/WebView 手工冒烟，也没有 stage、commit 或 push。
