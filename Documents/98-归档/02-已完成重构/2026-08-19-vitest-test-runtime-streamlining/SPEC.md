# Vitest 前端测试系统精简 - Spec

## 背景与目标

HeroUI 重构阶段 J 收口时，前端全量测试为 201 个文件、1058 项。第一阶段已经把测试分成 `unit`（Node）与 `dom`（JSDOM）两个 Vitest project，并移除了重复 setup；当时 `unit` 为 81 文件/443 项、约 11–16 秒，`dom` 为 120 文件/615 项、约 66 秒，全量三轮中位数为 90.72 秒。

逐文件语义审计确认，运行时继续变慢的主要风险不是阶段 J 新增了大量测试，而是 DOM 层重复验证同一行为、页面级 mock 过重、消费者复测共享组件、测试第三方组件内部合同，以及少量没有调用生产代码的假测试。本任务继续暂停 HeroUI 阶段 K，在已经完成的运行时分流上执行一次允许破坏性删除的语义 hard cut。

最终收口为 187 文件/886 项，测试代码由 29,404 行降至 24,076 行（-18.12%）：`unit` 81 文件/443 项、11.34 秒，`dom` 106 文件/443 项、40.76 秒；最终全量三轮为 51.28、54.11、57.00 秒，中位数 54.11 秒，较 90.72 秒下降 40.35%。直接运行一个 Node owner 的实测为 69ms；窄依赖源文件的 `related` 实测为 3.66 秒。共享 barrel 扇出较大的源文件仍可能命中大量消费者，因此 `related` 是依赖图工具，不是固定的秒级保证。`test:scripts` 另覆盖 16 个 Bun 脚本测试文件/150 项，并已纳入根 `check`。

目标不是追求更少的测试数量，而是让每项保留测试都能回答“它独立保护了什么产品风险”，并让一个行为只有一个测试 owner。开发内环优先运行相关测试或单一 project；全量门禁保留，但只在每批清理和阶段收口时运行。

## 范围

1. 保留已经完成的 Node/JSDOM project 分流、快速入口和完整全量门禁。
2. 逐项处理已审计的 201 个测试文件：保留独立风险，重写脆弱合同，合并重复 owner，删除无产品价值测试。
3. 将领域规则、状态机、投影、codec、payload 与 adapter 纯逻辑优先下沉到 Node owner；DOM 测试只保留用户行为与跨边界接线。
4. 收敛 CommandMenu、TaskBoard、TaskRowAdapter、LauncherPage、SettingsPage、ShellSidebar 等高成本 DOM owner。
5. 删除 HeroUI/ListView 自测、透传组件自测、测试夹具自测及无性能断言的 benchmark 装配。
6. 修复错误 test double、未等待异步 helper、全局媒体查询误模型与无条件 Provider 装配。
7. 清除现有未知 `console.warn` / `console.error`，并在预期输出由测试局部接管后建立覆盖收集、用例与文件收尾阶段的失败门禁。
8. 每批完成后执行对应 project 与全量门禁，最终用同机三轮中位数记录结果。

## 不做什么

1. 不引入 Vitest Browser Mode、Playwright Component Testing、Jest、happy-dom 或第三套测试 runner；真实浏览器层只在未来出现 JSDOM 无法复现的真实缺陷后重新评估。
2. 不建设 fixture 框架、测试基类、全局 mock registry、兼容 facade 或仅为未来扩展准备的抽象。
3. 不按 30% 等数量配额删测试，不删除廉价且保护独立风险的 Node 测试来换取数字。
4. 不设置覆盖率门禁，不新增 CI/CD，不接入 PostgreSQL ignored tests，也不把 production build 塞进本地根 `check`。
5. 不批量重命名 201 个测试文件；只有环境归属错误且正在修改的文件才采用更清晰的文件形态。
6. 不为了测试性能批量改写 HeroUI 生产导入路径；公开子路径只在真实 owner 边界与可读性同时受益时使用。
7. 不用提高 timeout、关闭隔离、隐藏 console 输出或固定 worker 数量掩盖真实问题。

## 用户场景与需求

- 作为开发者，我想在日常修改时只运行相关测试或 Node project，以便在数秒到十几秒内获得可信反馈。
- 作为维护者，我想知道每项测试保护的独立风险及其唯一 owner，以便重构组件时不需要同步维护多份重复合同。
- 作为桌面应用用户，我希望创建、编辑、危险操作、键盘、焦点、Overlay、自动保存与失败恢复仍有可靠保护。
- 作为发布者，我想在阶段收口时运行完整门禁，以便提速不是通过漏跑关键行为获得。

## 能力边界

| 能力 | 唯一职责 |
| --- | --- |
| Node owner | 领域不变量、状态机、codec、投影、payload、use case、port/adapter 转换及历史回归 |
| DOM owner | StoneFlow 自有组件的可见语义、键盘/焦点/Overlay、表单提交与必要接线 |
| 消费者 smoke | 只验证消费者把输入、动作或路由正确接到 owner，不重演共享行为矩阵 |
| 手工 Tauri 冒烟 | 窗口、原生快捷键、WebView 焦点与运行时集成；自动测试不得冒充已通过 |
| 风险 owner | 删除该测试会让一个明确产品风险失去保护的最小测试位置 |
| Console 门禁 | 未被当前测试显式接管的 `warn` / `error` 视为失败，不以 `--silent` 隐藏 |
| Bun 脚本测试 | `scripts/**/*.test.ts` 由 `test:scripts` 完整发现，不与 `src/**` Vitest projects 混合 |

## Definition of Done

- 201 个原始测试文件均有明确的保留、重写、合并或删除去向，最终 suite 不存在已知的纯第三方、自证、夹具自测或消费者重复合同。
- 领域、application、port 与 adapter 风险优先由 Node owner 保护；DOM suite 只承担必须依赖浏览器语义的职责。
- 高风险行为继续有自动化保护：数据丢失、并发、危险操作、路由、键盘、焦点、Overlay、无障碍与真实历史回归不得因提速被删。
- 未知 `console.warn` / `console.error` 为零，预期输出由对应测试局部 spy 并断言。
- `unit`、`dom`、`test:scripts`、全量及根级静态质量门禁通过；三轮全量与各 project 耗时、文件数和测试数已记录。
- 活跃任务索引、HeroUI 阶段 K 暂停状态和测试架构文档已同步。

## 验收标准

- **AC-1**：当运行根级 `bun run test:run` 时，Vitest 应当执行 Node 与 DOM 两个 project 的全部保留测试，且不得漏跑或重复执行测试文件。
- **AC-2**：当运行 `bun run test:unit` 时，测试应当使用 Node 环境且不加载 DOM setup；当运行 `bun run test:dom` 时，测试应当使用 JSDOM 与最小 DOM setup。
- **AC-3**：当某项行为已经有唯一风险 owner 时，其他消费者测试应当只保留必要接线 smoke，不得复制同一选项矩阵、Tooltip、焦点、timer 或状态转换合同。
- **AC-4**：当测试验证领域规则、状态机、codec、payload 或纯投影时，它应当归入 Node owner；除非行为依赖真实 DOM API，否则不得使用 JSDOM。
- **AC-5**：如果测试只证明第三方 HeroUI/ListView、React 透传组件或测试夹具自身能够工作，则该测试应当删除；供应商升级由 lockfile、StoneFlow owner 测试和升级验证承担。
- **AC-6**：当页面或组件测试需要替身时，替身应当只实现消费者使用的公开合同并正确传递必要 props/ref；不得重实现第三方组件或无条件 `importOriginal` 整个 feature barrel。
- **AC-7**：当测试调用异步 render/router helper、fake timer、事件订阅或 Provider 时，它应当等待并清理自己创建的异步工作，不得把未完成更新泄漏到其他测试。
- **AC-8**：只要测试运行，`matchMedia` 等全局 polyfill 就应当使用保守默认值；需要特定媒体条件的测试必须显式声明，不得让所有查询默认为真。
- **AC-9**：如果生产代码或第三方组件会产生预期 `console.warn` / `console.error`，对应测试应当局部接管并断言；其他未知 warning/error 应当使测试失败。
- **AC-10**：当删除或合并测试时，创建、编辑、提交、危险操作、自动保存、失败恢复、路由、键盘、焦点、Overlay、无障碍及历史回归必须仍由可定位的 owner 覆盖。
- **AC-11**：当开发者日常修改代码时，应当可使用 Vitest watch、related 或单一 project 获得快速反馈；这些快速入口不得取代每批 hard cut 和阶段收口的完整门禁。
- **AC-12**：当三批 hard cut 完成后，应当用同机、同命令连续运行三轮全量测试并记录中位数；是否成功以风险覆盖、零未知警告和实测下降共同判断，不按测试数量配额判断。

## 关联模块

| 模块 | 角色 |
| --- | --- |
| `vitest.config.ts` | Node/DOM project、隔离、console 门禁与完整发现规则的唯一配置入口 |
| `src/test/**` | 最小 DOM polyfill、router render helper 与显式测试 Provider |
| `src/features/**` | 领域/application/adapter owner 与业务 DOM 消费者测试 |
| `src/layout/**`、`src/routes/**`、`src/shared/**` | Shell、Overlay、路由与共享 UI 的唯一 DOM owner |
| `package.json` | watch、project 与全量根级命令 |
| `Documents/98-归档/02-已完成重构/2026-08-19-vitest-test-runtime-streamlining/` | 本次决策、执行状态与测量证据的归档任务文档 |

## 当前技术方案

继续使用 Vitest + React Testing Library，不新增 runner。测试架构按“Node owner → DOM owner → 手工 Tauri 冒烟”分层，以“一个独立风险一个 owner”为删除和迁移标准；按 Node、业务 DOM、平台 DOM 三批 hard cut，每批运行完整门禁。详细取舍见 [PLAN.md](./PLAN.md)。

## 关联文档

- [Vitest 测试性能研究与清理时机建议](../2026-08-12-heroui-ui-interaction-system-refactor/VITEST-PERFORMANCE-RESEARCH.md)
- [HeroUI 重构 TASKS](../2026-08-12-heroui-ui-interaction-system-refactor/TASKS.md)
- [任务方案编写 SOP](../../../任务方案编写SOP.md)
