# Vitest 测试性能研究与清理时机建议

> 日期：2026-08-18  
> 范围：StoneFlow 前端 Vitest 测试；不包含 `bun test scripts/release` 与 Rust 测试  
> 资料边界：Vitest、Testing Library 官方文档及当前仓库/已安装包源码；未采用二手性能文章  
> 本文首先记录研究、仓库证据与建议；文末另记 2026-08-19 的实施决策。

## 结论

**应该现在处理，但不应该现在做“全仓删测试”。** 推荐在阶段 K 前插入一个窄范围的测试运行时治理步骤：先消除全局 `jsdom`、全局 React Testing Library setup、重复 cleanup 与不受控 worker 带来的固定成本，再处理已测出的真实慢测试。测试语义的破坏性清场仍留在阶段 M 的 T108：只有旧实现已零消费者时，才删除相应实现细节测试。

判断依据：

1. 阶段 I 收口是 200 个文件、1062 项测试；阶段 J 收口是 201 个文件、1058 项测试。J 只净增 1 个文件、反而净减 4 项测试，因此没有“阶段 J 测试数量爆炸”的证据。[TASKS 完成记录](./TASKS.md#完成记录)
2. 当前一次受控全量诊断的墙钟是 **70.23s**。Vitest 的累计阶段时间为 `transform 8.57s / setup 23.36s / import 431.20s / tests 45.63s / environment 92.99s`。并行阶段时间不能相加当墙钟，但它清楚表明主要成本在**文件导入、JSDOM 环境和每文件 setup**，不是 1058 个 assertion 本身。
3. 当前 201 个测试文件全部使用 `jsdom` 并执行同一个 setup；静态扫描至少发现 80 个文件既不直接导入 Testing Library，也不直接访问 DOM/browser globals，是优先验证为 `node` 项目的候选集。
4. 当前 setup 会导入 React Testing Library。Testing Library 在 Vitest `globals: true` 时本来就会注册自动 cleanup；仓库又手工 `cleanup()`，形成重复清理。Vitest 已启用 `restoreMocks: true`，setup 又手工 `vi.restoreAllMocks()`，也形成重复恢复。
5. 若干慢测试确实在等待产品的 500ms Tooltip 延迟。Tooltip 延迟合同已经由共享 Tooltip 测试专门覆盖；消费者测试不应反复用真实时间重测同一延迟。

因此，长期最优顺序不是“先删测试文件”，而是：

1. **现在：**建立可重复基线，清理全局运行成本，拆分 `node` 与 `jsdom` 测试项目，测定稳定 worker/pool。
2. **阶段 K/L 开发内环：**默认运行文件过滤、`related` 或 `--changed`；每个阶段收口只跑一次受控全量。
3. **阶段 M/T108：**随旧代码零消费者证明，删除失效实现细节测试和重复的旧 UI DOM 断言；保留产品行为、可访问性、焦点、领域契约和已发生回归的保护测试。

## 当前仓库证据

### 版本与入口

- [package.json](../../../../package.json) 声明 `vitest ^4.1.10`、`@vitest/coverage-v8 ^4.1.10`、`jsdom ^30.0.1`；当前安装结果是 `vitest/4.1.10 darwin-arm64 node-v24.16.0`。
- 普通全量入口是 `vitest run`；coverage 是单独的 `vitest run --coverage`。因此 coverage 配置**不会**解释普通 `test:run` 的耗时。
- 根级 `check` 每次都会执行全量前端、release 与 Rust 测试。开发内环不应把这个最终门禁当作每次编辑后的默认命令。

### 当前 Vitest 配置

[vitest.config.ts](../../../../vitest.config.ts) 当前对所有 `src/**/*.test.{ts,tsx}` 统一设置：

```ts
globals: true
environment: 'jsdom'
setupFiles: ['./src/test/setup.ts']
clearMocks: true
restoreMocks: true
```

未显式设置 `projects`、`isolate`、`pool`、`maxWorkers`、`fileParallelism`、`sequence`、`testTimeout`、`hookTimeout`、`reporters` 或 `slowTestThreshold`，所以使用 Vitest 4.1 的默认值。

### 测试面静态盘点

| 项目 | 当前值 | 含义 |
| --- | ---: | --- |
| 测试文件 | 201 | 91 个 `.test.ts`，110 个 `.test.tsx` |
| 测试项 | 1058 | 阶段 J 收口记录 |
| 显式 `@vitest-environment jsdom` | 14 个文件 | 在当前全局 `jsdom` 下重复；说明仓库曾有按文件区分环境的意图 |
| 直接导入 React Testing Library | 112 个文件 | 其余文件也会因全局 setup 间接加载它 |
| 直接访问 DOM/browser globals | 63 个文件 | 静态启发式，不代表完整传递依赖 |
| 未直接使用 Testing Library 或 DOM globals | 80 个文件 | `node` 项目候选，不是已经证明可迁移的清单 |
| 使用 fake timers | 9 个文件 | 9 个都能静态找到 `vi.useRealTimers()`，未发现明显未恢复文件 |
| 使用 `.concurrent` | 0 个文件 | 当前没有文件内并发合同 |
| 运行时导入 feature barrel 的测试 | 46 个文件 | 只是 profiling 候选；跨 feature 公共入口不能因性能猜测直接改成私有深层 import |
| 从 HeroUI OSS/Pro 包根入口导入 | 47 个源码文件、57 条 import | 其中 8 个测试文件直接导入；生产依赖还会把根入口传递带入测试图 |

这里的 80 个候选只基于直接 import/global 使用扫描。传递依赖可能仍读取 DOM，必须用独立 `node` project 实跑证明，不能靠文件扩展名直接宣布兼容。

### 全量诊断样本

命令：

```bash
bun run test:run -- --reporter=default --reporter=json \
  --outputFile.json=/tmp/stoneflow-vitest-full-20260818.json \
  --slowTestThreshold=100 --no-color --no-cache
```

结果：201/201 文件、1058/1058 测试通过，墙钟 70.23s。

| Vitest 阶段 | 累计时间 | 解释 |
| --- | ---: | --- |
| transform | 8.57s | Vite 转换 |
| setup | 23.36s | 每个测试文件前执行 setup |
| import / collect | 431.20s | 导入测试及其依赖并收集测试 |
| tests | 45.63s | 测试函数本身 |
| environment | 92.99s | 主要是每文件 JSDOM 环境 |
| 墙钟 | 70.23s | 多 worker 并行后的真实等待时间 |

这是一轮显式 `--no-cache` 的诊断样本，不是正式性能预算；应用变更前后必须用相同命令、相同机器、至少三轮中位数比较。Vitest 官方也明确说明终端汇总的 transform/setup/import/tests/environment 分别代表什么，[见 Profiling Test Performance](https://vitest.dev/guide/profiling-test-performance)。

同机器的补充诊断中，默认 9 workers 为 70.23s，`maxWorkers=4` 虽然仍全部通过，但墙钟为 100.18s，慢 42.6%。因此 `4` 只能证明“这一轮稳定”，不能作为性能最优默认值；最终并发度仍需三轮中位数与稳定性共同决定。

JSON reporter 中测试执行时间最慢的文件如下；它不包含该文件分摊的全部 import/environment 成本：

| 文件 | 测试执行时间 | 测试项 |
| --- | ---: | ---: |
| `CommandMenu.test.tsx` | 3.416s | 24 |
| `LauncherPage.test.tsx` | 3.027s | 25 |
| `ShellSidebar.test.tsx` | 2.548s | 10 |
| `TaskRowAdapter.test.tsx` | 1.697s | 24 |
| `-task-board-benchmark.test.tsx` | 1.686s | 3 |
| `TaskBoard.test.tsx` | 1.587s | 17 |
| `TaskCreateContent.test.tsx` | 1.534s | 8 |
| `GlobalSearchInput.test.tsx` | 1.526s | 6 |
| `SettingsPage.test.tsx` | 1.253s | 21 |
| `TaskDetailContent.test.tsx` | 0.956s | 13 |

其中多个单测的 500–617ms 时长与共享 Tooltip 的生产默认 `delay=500` 对齐，例如 `MainCardLayout`、`TaskPreview`、`AppBreadcrumb` 和 `CommandActionTooltip` 的消费者测试。共享 [Tooltip.test.tsx](../../../../src/shared/components/tooltip/Tooltip.test.tsx) 已用 fake timers 精确验证 `499ms/500ms` 边界；消费者应验证自己拥有的文案、可访问性或 command 投影，而不是再次等待真实 500ms。

### import/module graph 是独立治理面

[PLAN「版本与安装」](./PLAN.md#版本与安装) 已明确要求：除 Pro Resizable 外，各组件使用 HeroUI 各自公开入口，不建立统一 barrel。当前扫描仍发现 47 个源码文件、57 条语句从 `@heroui/react` 或 `@heroui-pro/react` 包根入口导入；8 个测试文件直接这样做，更多测试会通过生产模块传递进入该图。

这里需要区分三层判断：

1. **Vitest 官方事实：**`import` 指标包含测试文件及其依赖的导入和测试收集；官方建议用 Module Info / `experimental.importDurations` 找慢模块，并指出 barrel 会造成不必要转换。对提供公开子入口的依赖，优先使用具体入口；对深依赖树的 UI 库，还可测量 `deps.optimizer.client`，但必须以 profiling 证明收益。[Vitest File Import](https://vitest.dev/guide/profiling-test-performance#file-import)
2. **仓库合同：**HeroUI 应遵守已经批准的公开子入口，而不是导入包内私有文件。这不是单纯为了测试提速，也是 PLAN 已确定的依赖边界。
3. **补充工程原则：**Vercel `bundle-barrel-imports` 同样建议非 Next.js 项目在库提供公开且有类型的子路径时直接导入；它支持本次方向，但不是 Vitest 官方结论，也不能替代 StoneFlow 的实际 import-duration 数据。

因此应先让 import profiling 给出最慢的 HeroUI/feature 入口，再按 PLAN 将命中的根入口改为**官方公开子入口**并复测。不要批量猜测包内路径，也不要把跨 feature 的公共 facade 改成私有实现导入。`deps.optimizer.client` 只是直接入口治理后仍有显著深图成本时的第二候选，不先加配置。

## 官方事实、仓库适用性与决策

### 1. `environment` 与 `projects`

**官方事实**

- Vitest 默认环境是 `node`；`jsdom`/`happy-dom` 是浏览器模拟环境，也可以用文件 docblock 覆盖。[Environment 配置](https://vitest.dev/config/environment)
- `projects` 可以在同一个 Vitest 进程中定义不同环境和 runner 配置；`workspace` 名称从 3.2 起已被 `projects` 取代。[Test Projects](https://vitest.dev/guide/projects)

**仓库证据**

- 201 个文件全部支付 JSDOM 环境成本，累计 environment 92.99s。
- 至少 80 个文件没有直接 DOM/Testing Library 使用。
- 当前 14 个 `jsdom` docblock 在全局 `jsdom` 配置下没有区分作用。
- 同一组 20 个纯逻辑文件（166 项测试）的受控对照中，`jsdom` 墙钟 5.272s，`node` 墙钟 3.056s，快 42%；这支持拆分环境的方向，仍不代表全部 80 个候选都已证明可迁移。

**推断与建议**

- 最高优先级实验是拆成 `node` 与 `jsdom` 两个 project，而不是删除测试。
- `node` project 只运行纯领域、application、codec、reducer、projection 与数据转换测试，不加载 DOM setup。
- `jsdom` project 运行 React component/hook、焦点、键盘、可访问性与浏览器存储测试，只在这里加载 jest-dom、RTL 与 HeroUI 需要的最小 polyfill。
- 初次拆分保持 `isolate: true`；先只改变环境与 setup，避免同时改变多个正确性变量。
- 不建议为了速度直接换 `happy-dom`。它是不同模拟实现，可能改变 React Aria/HeroUI 的焦点、布局和事件语义；只有单独兼容性验证证明收益与行为一致时再考虑。

一个低心智负担的候选约定是：纯 `.test.ts` 进入 `node`，DOM/React `.test.tsx` 进入 `jsdom`；先处理少量扩展名与实际环境不一致的例外，再落 projects。该约定必须先通过临时 config 实跑确认，不能只靠静态扫描 hard cut。

### 2. `setupFiles`

**官方事实**

- setup file 在**每个测试文件之前**、测试所在 worker 中执行，不是全局只执行一次；关闭 isolation 后 setup 仍会在每个文件前执行。[setupFiles 配置](https://vitest.dev/config/setupfiles)
- 真正昂贵且可跨文件共享的外部资源才适合 `globalSetup`；它运行在不同全局作用域，不能拿来替代 jest-dom matcher、DOM polyfill 或每测试 cleanup。[Test Run Lifecycle](https://vitest.dev/guide/lifecycle)

**仓库证据**

- 当前 setup 累计 23.36s，并且所有 201 个文件都会导入 `@testing-library/react`。
- [src/test/setup.ts](../../../../src/test/setup.ts) 还混合了 matcher 注册、DOM polyfill、RTL cleanup 与 mock restore 四种职责。

**推断与建议**

- 先删除 setup 中重复的手工 `cleanup()` 与 `vi.restoreAllMocks()`；保留 Vitest config 的 mock 策略。
- DOM polyfill 只属于 `jsdom` project。纯 Node project 不应加载 React Testing Library、jest-dom 或 ResizeObserver/scroll/matchMedia 桩。
- 不新增自定义 fixture 框架或“测试基础设施抽象层”；Node project 保持 setup 为空，至多保留一个窄的 DOM setup。

### 3. `isolate`

**官方事实**

- `isolate` 默认 `true`。官方只建议在代码没有副作用并正确 cleanup 时尝试关闭，且明确指出这通常更适合 `node` 环境；可按 project 局部关闭。[isolate 配置](https://vitest.dev/config/isolate)、[Improving Performance](https://vitest.dev/guide/improving-performance)

**仓库证据**

- 测试广泛使用模块 mock、Zustand/store、browser globals、React Query/provider、fake timers 和 Tauri mock。
- 全局 `jsdom` 测试当前没有证明可安全共享 module/global state。

**推断与建议**

- **不要全局 `isolate: false`。** 这会以隐藏状态泄漏换速度，违背回归测试的可信度。
- 只有纯 Node project 在三轮全量、shuffle/repeat 与跨顺序验证都稳定后，才把 `isolate: false` 作为第二阶段实验；收益不足则保持默认。

### 4. `pool`、worker 与 `fileParallelism`

**官方事实**

- Vitest 4 默认 `pool: 'forks'`。`threads` 通信通常更快，但不支持 `process.chdir()`，部分 native library 在线程池有崩溃风险。[pool 配置](https://vitest.dev/config/pool)
- 文件默认并行；`maxWorkers` 控制 worker 数。更多 worker 同时增加 CPU/内存压力，最佳值依赖机器与测试重量。[Parallelism](https://vitest.dev/guide/parallelism)、[maxWorkers](https://vitest.dev/config/maxworkers)
- `fileParallelism: false` 会把 `maxWorkers` 覆盖为 1；它主要用于共享外部资源或诊断，不是通用加速开关。[fileParallelism](https://vitest.dev/config/fileparallelism)

**仓库证据**

- 阶段 I 默认全量并发曾让 Launcher 与延期 benchmark 超时；`--maxWorkers=4` 完成全量。
- 当前配置未固定 worker 数，因此不同机器会随 `os.availableParallelism()` 改变并发压力。
- 已安装 Vitest 4.1.10 配置 API使用 `maxWorkers`；不要照搬旧版 `maxThreads/maxForks/poolOptions` 或不存在于当前配置面的 `minWorkers` 教程。
- 当前受控样本中，默认 9 workers 墙钟 70.23s，4 workers 墙钟 100.18s；降低并发度没有带来速度收益。

**推断与建议**

- 先用 `forks × maxWorkers=2/4` 和 `threads × maxWorkers=2/4` 做同机三轮矩阵，比较中位墙钟、峰值内存、超时与稳定性。
- `4` 是已通过全量的稳定参考值，但当前样本已证明它比默认 9 workers 明显更慢；不应把它固化为性能默认值。
- 不要全局关闭 file parallelism；它很可能把 201 个文件串行化得更慢。
- `threads` 只作为测量候选。若 Tauri mock、JSDOM 或依赖在线程池出现 hang/segfault，保留默认 forks。

### 5. `sequence`

**官方事实**

- `sequence` 负责排序、shuffle、hook/setup 顺序与多 project 的 group order；自定义 sequencer 不会减少需要转换、导入和执行的文件。[sequence 配置](https://vitest.dev/config/sequence)

**仓库证据**

- 当前只有一个 setup file，也没有 concurrent tests。

**推断与建议**

- 不写自定义 sequencer，不改 `sequence.setupFiles`。
- shuffle 只用于验证共享状态/关闭 isolation 的安全性，不作为日常加速手段。
- projects 默认可并行运行；若两个 project 争抢内存再测 `sequence.groupOrder`，不提前串行化。

### 6. `testTimeout` 与 `hookTimeout`

**官方事实**

- Vitest 默认 `testTimeout=5000ms`、`hookTimeout=10000ms`。[CLI/config 参考](https://vitest.dev/guide/cli)

**仓库证据**

- 当前没有覆盖默认值；已发生的问题是高并发下特定文件超时，而不是默认 timeout 配置过低的证据。

**推断与建议**

- 不提高全局 timeout。提高只会延后暴露 hang/资源争抢，不会让测试更快。
- 真实长任务只在单个 test/hook 上声明精确 timeout，并先解释为什么它必须长。
- 性能测试应有自己的项目/命令与预算，不借普通单元测试 timeout 隐藏慢行为。

### 7. mock、cleanup 与 fake timers

**官方事实**

- `clearMocks` 在每个测试前清除调用历史但保留实现；`restoreMocks` 可替代手工 `afterEach(vi.restoreAllMocks)`。[clearMocks](https://vitest.dev/config/clearmocks)、[Mock Functions](https://vitest.dev/guide/learn/mock-functions#resetting-mocks)
- React Testing Library 在 Vitest 开启 globals 后自动注册 cleanup；不需要再手工 `afterEach(cleanup)`。[Testing Library Vitest setup](https://testing-library.com/docs/react-testing-library/setup/#auto-cleanup-in-vitest)
- fake timers 可把真实 timeout/interval 等待变成确定性推进；结束后用 `vi.useRealTimers()` 恢复。[Timers](https://vitest.dev/guide/mocking/timers)、[Mocking Dates](https://vitest.dev/guide/mocking/dates)

**仓库证据**

- config 已启用 `clearMocks`、`restoreMocks`。
- setup 同时手工调用 RTL cleanup 和 `vi.restoreAllMocks()`。
- 9 个 fake-timer 文件都存在 `vi.useRealTimers()`；当前没有依据全局改 timer 配置。
- 至少四个消费者用例实际等待共享 Tooltip 的 500ms 产品延迟。

**推断与建议**

- 删除 setup 的重复 cleanup/restore 是现在就可以做的低风险清理，但必须用全量测试确认 hook 顺序没有被个别用例依赖。
- 共享 Tooltip 测试保留一个精确的 499/500ms 合同；消费者测试改为 focus 即开、受控 `delay=0` 测试入口、或 fake timers 推进，按其真正 owner 选择最小方案。
- 不在全局启用 fake timers。React Aria、promise/microtask、Testing Library polling 会因此改变调度语义；只在拥有时间合同的测试局部使用。
- 不批量删除测试内 `vi.clearAllMocks()`；先确认它是重复 beforeEach，还是测试中途确有清零需求。

### 8. 文件内并发

**官方事实**

- `.concurrent` 只把同一 worker 内的异步测试放进 `Promise.all`；纯同步测试不会获益，beforeEach/afterEach 与共享 mock 还会重叠。[Parallelism](https://vitest.dev/guide/parallelism)

**仓库证据**

- 当前 0 个 concurrent 文件；UI 测试大量共享 document、screen、mock 和 hooks。

**推断与建议**

- 不全局开启 `sequence.concurrent`，也不批量加 `.concurrent`。
- 只有完全独立、主要等待外部异步 I/O 的同文件测试才逐个评估；当前前端测试主要是 CPU/DOM 与 fake async，不是优先收益点。

### 9. 过滤、`related` 与 `--changed`

**官方事实**

- 文件路径过滤能避免加载无关文件；只用 `-t`、tag、`.only` 时，Vitest 通常仍需加载文件来发现测试。[Test Filtering](https://vitest.dev/guide/filtering)
- `vitest related --run <source files>` 根据静态 import graph 运行相关测试，不支持路径变量形式的动态 import。[CLI `vitest related`](https://vitest.dev/guide/cli#vitest-related)
- `--changed` 可针对未提交改动、commit 或 branch 运行相关测试；Vitest config/package 变化默认触发全量。[changed 配置](https://vitest.dev/config/changed)

**仓库适用性与建议**

- 开发内环优先使用测试文件路径；修改多个源文件时使用 `related --run` 或 `--changed`。
- feature barrel 与动态 import 会影响 related 精度；相关测试通过不等于全量门禁通过。
- 每个阶段收口继续执行受控全量，最终 T120 继续执行根级完整门禁。这是减少等待，不是降低交付标准。

建议命令：

```bash
# 单文件/目录内环
bun run test:run -- src/features/command/components/CommandMenu.test.tsx

# 按静态依赖图选择
bunx vitest related --run src/features/command/core/command-runtime.ts

# 针对工作区未提交改动
bun run test:run -- --changed

# 阶段收口：在 worker 矩阵完成前暂不固化未证明的并发值
bun run test:run
```

### 10. coverage

**官方事实**

- coverage 默认关闭；只有 `--coverage` 或 `coverage.enabled` 才收集。[coverage 配置](https://vitest.dev/config/coverage)
- V8 provider 通常比 Istanbul 执行快、内存低，但加载大量不同模块时也可能更慢；V8 无法把运行时收集限制为少数模块。[Coverage guide](https://vitest.dev/guide/coverage)
- coverage 慢时可用 `DEBUG=vitest:coverage` 查看转换、未覆盖文件和报告生成耗时。[Profiling coverage](https://vitest.dev/guide/profiling-test-performance#code-coverage)

**仓库适用性与建议**

- 普通 70.23s 基线没有启用 coverage；不要通过改 coverage reporter 解释或优化普通全量。
- `coverage.include: src/**/*` 是覆盖率完整性的选择，会让 coverage 处理未导入文件；只在 coverage 命令单独 profiling。
- 不把 coverage 加到每次开发内环；保留为显式质量命令或 CI gate。

### 11. reporter、慢测阈值与 profiling

**官方事实**

- 默认 reporter 已可报告慢测试；`slowTestThreshold` 默认 300ms，只影响标记/展示，不会优化执行。[reporters](https://vitest.dev/config/reporters)、[slowTestThreshold](https://vitest.dev/config/slowtestthreshold)
- Vitest 官方首先建议查看汇总阶段；导入慢可用 `experimental.importDurations.print`，runner CPU/heap 可用 Node profile，coverage 可用 DEBUG 日志。[Profiling Test Performance](https://vitest.dev/guide/profiling-test-performance)
- 官方特别指出 barrel import 可能造成不必要转换；应由 Module Info/import durations 证明后再改入口。

**仓库适用性与建议**

- 诊断期用 `slowTestThreshold=100` 和 `experimental.importDurations.print`；不要永久换 verbose reporter 或自建 reporter。
- 先定位慢 module/import，再处理 46 个 feature-barrel 候选。跨 feature 的正式 public API 不应为了微基准直接深层导入；若 public barrel 本身过重，应收窄公共契约，而不是让消费者越界。
- 按 PLAN 处理 profiling 命中的 HeroUI 包根入口，改用供应商公开子入口；不要把 Vercel 的通用 barrel 数字冒充 StoneFlow 测量值。
- 若公开子入口治理后 UI 库的深模块树仍主导 import，再单独测 `deps.optimizer.client.include`；Vitest 官方称它对 UI 库和深 import tree 尤其有效，但是否适合锁定版 HeroUI 必须由本仓库数据决定。
- `--logHeapUsage` 只在怀疑内存压力时使用；CPU/heap profile、`hanging-process` reporter 或 async leak 检测只在汇总无法解释或退出 hang 时启用。

一次性诊断命令：

```bash
bun run test:run -- --maxWorkers=4 --slowTestThreshold=100 \
  --experimental.importDurations.print
```

不要把实验性 import profiling 永久开启；Vitest 官方注明额外解析本身有成本。

## 推荐实施顺序

### J.5-A：先做低风险运行时清理

1. 用相同命令跑三轮，记录墙钟中位数及 transform/setup/import/tests/environment。
2. 从 `src/test/setup.ts` 删除重复 RTL cleanup 与手工 mock restore，只保留当前确实需要的 matcher/polyfill。
3. 开启一次 import-duration 诊断，优先把命中的 HeroUI 根入口迁到 PLAN 已要求的公开子入口；只处理 profiling 证明的重型 feature barrel。
4. 把 Tooltip 500ms 合同保留在共享 Tooltip 测试；逐个清理消费者中的真实等待，不删消费者拥有的产品断言。
5. 复跑全量三轮和 9 个 fake-timer 文件，确认没有 timer/mock/DOM 泄漏。

### J.5-B：拆分执行环境

1. 用临时 config 把 80 个静态候选放入 `node` project，setup 为空；其余保持 `jsdom + DOM setup + isolate=true`。
2. 修正传递依赖暴露的错误边界：纯 domain/application 测试若因 feature barrel 拉入 UI，应收窄 import；不要给 Node project 补 DOM polyfill 来掩盖错误依赖。
3. 候选集全部通过后再固化文件命名与 project globs，并删除已经没有意义的 14 个重复 docblock。
4. 比较拆分前后三轮中位数；收益没有超过正常波动就回退，不为“架构漂亮”保留复杂配置。

### J.5-C：测定并发参数

在环境拆分后测量：

| pool | maxWorkers | 目的 |
| --- | ---: | --- |
| forks | 2 | 低资源基线 |
| forks | 4 | 当前已知稳定，但单轮实测比默认 9 workers 慢 42.6% |
| threads | 2 | 线程兼容性与低争抢 |
| threads | 4 | 可能的最快候选 |

每组至少三轮，比较中位墙钟、失败/超时、峰值内存。只固化一个在目标开发机与 CI 都稳定的值；不同时启用 `isolate=false`，避免无法归因。

### K/L：改变日常验证节奏，不降低 Gate

- 编辑后：文件路径或 `related --run`。
- 一个任务完成：feature/owner 聚焦集合。
- 一个阶段完成：使用已测定的默认并行参数执行全量前端测试一次。
- T120：保留现有完整根级门禁。

### M/T108：再做语义性测试删除

只删除以下内容：

- 已删除 primitive/adapter 的实现细节 DOM 测试；
- 同一个旧交互 workaround 被多个消费者重复断言、且新平台已由单一 owner 覆盖的测试；
- 只验证第三方库内部 DOM、没有 StoneFlow 产品合同的测试；
- 零消费者测试 helper/fixture。

继续保留：

- 领域规则、command projection、selection snapshot、codec/reducer 等纯测试；
- 用户可见行为、错误/危险操作、键盘、焦点恢复、可访问性；
- 历史真实回归测试；
- HeroUI/Radix 迁移期间仍有消费者的旧表面测试，直到对应 owner hard cut。

这与 SPEC 的“重写只断言旧 DOM 的测试，保留并增强产品行为、可访问性和焦点测试”以及 T108 的“只删除零消费者实现细节测试”一致。

## 不推荐的方案

- **现在全仓删/合并测试文件：**没有证明文件数量是主因，还会在 K/L 大量 UI hard cut 前移除回归保护。
- **全局 `isolate=false`：**当前共享 mock/store/DOM 状态太多，正确性风险高。
- **全局 `fileParallelism=false`：**会强制单 worker，通常只会延长 201 文件总耗时。
- **全局 `.concurrent`：**同步 DOM 测试不获益，mock/cleanup 反而互相干扰。
- **提高 timeout：**掩盖争抢或 hang，不减少耗时。
- **先换 happy-dom、VM pool 或自定义 sequencer：**同时改变行为语义或引入已知内存/调试代价，当前证据不支持。
- **新增测试框架抽象、fixture 容器或自定义 reporter：**Vitest 原生 projects/filter/profiling 已覆盖需求，KISS 优先。
- **把所有 public barrel 改为私有深层 import：**可能破坏 feature 边界；只修 profiling 证明的重型入口，并优先收窄公共契约。

## 验收标准

运行时治理完成需同时满足：

1. 201 个当前测试文件与 1058 项测试保持通过，除已精确证明无效的断言外不降低覆盖语义。
2. 同机同命令至少三轮并记录中位数与稳定性；形成显著短于全量的 Node 快反馈入口，且不以漏跑测试换速度。
3. 默认全量不再因 worker 资源争抢让 Launcher/benchmark 偶发超时。
4. Node project 不加载 JSDOM、RTL 或 DOM polyfill；JSDOM project 保留真实焦点、键盘、可访问性测试所需隔离。
5. 9 个 fake-timer 文件均恢复真实 timers；mock、DOM 与 module state 在跨文件/不同顺序下不泄漏。
6. related/changed 只用于开发内环；阶段收口与 T120 的全量 Gate 不被替代。

## 2026-08-19 实施决策

- 测试集合已拆为 `unit` 81 文件/443 项与 `dom` 120 文件/615 项，互斥合计仍为 201 文件/1058 项。`unit` 不加载 DOM setup，两次独立样本为 11.24s 与 16.25s；`dom` 最终独立样本为 65.70s。
- 保留默认 `forks`、自动 worker、文件并行与隔离。对照样本中，`maxWorkers=4` 为 100.18s、`threads` 为 97.41s、两个 project 串行为 91.67s；这些不同阶段的单轮样本都没有显示出值得固化额外 runner 参数的可重复收益。
- 三次原始基线为 70.23s、101.23s、125.35s，中位数 101.23s，但第三轮有 2 个 Launcher 断言失败。最终保留代码的三次全量为 87.73s、90.72s、96.97s，中位数 90.72s，全部通过；表面中位数下降约 10.4%，但基线波动过大，不能把它当成精确加速比。
- 大面积子路径仍存在时的三次实验为 87.34s、89.86s、98.14s，中位数 89.86s；比最终回退后的 90.72s 只快 0.86s，明显处于运行波动内，不能证明这批改写值得保留。
- 不保留大面积 HeroUI public subpath 改写。它只可能影响 transform/import，不能解决 JSDOM、setup 或真实 timer；本轮没有隔离 A/B 证明足以抵偿 50 多个文件的可读性成本。
- 最终只保留低复杂度且可解释的改动：Node/DOM 分流、重复 cleanup/restore 删除、消费者 mock 中复制的 150ms debounce 删除、无消费 Provider 删除，以及无需其余真实导出时移除测试 `importOriginal`。
- 长期衡量标准改为两层：开发内环使用 project/file/related/changed 获得快速反馈；阶段与发布仍执行完整门禁。全量吞吐继续记录，但不以不稳定的单机单轮数据驱动大面积生产导入重写。

## 一手资料

- [Vitest: Profiling Test Performance](https://vitest.dev/guide/profiling-test-performance)
- [Vitest: Improving Performance](https://vitest.dev/guide/improving-performance)
- [Vitest: Test Environment](https://vitest.dev/config/environment)
- [Vitest: Test Projects](https://vitest.dev/guide/projects)
- [Vitest: setupFiles](https://vitest.dev/config/setupfiles)
- [Vitest: Parallelism](https://vitest.dev/guide/parallelism)
- [Vitest: Pool](https://vitest.dev/config/pool)
- [Vitest: Isolation](https://vitest.dev/config/isolate)
- [Vitest: Test Filtering](https://vitest.dev/guide/filtering)
- [Vitest: CLI](https://vitest.dev/guide/cli)
- [Vitest: Coverage](https://vitest.dev/guide/coverage)
- [Vitest: Mock Functions](https://vitest.dev/guide/learn/mock-functions)
- [Vitest: Timers](https://vitest.dev/guide/mocking/timers)
- [Testing Library: Setup / Auto Cleanup in Vitest](https://testing-library.com/docs/react-testing-library/setup/#auto-cleanup-in-vitest)
- [Vercel: How we optimized package imports in Next.js](https://vercel.com/blog/how-we-optimized-package-imports-in-next-js)（只作为 barrel import 的补充工程原则，不作为 Vitest 事实）
