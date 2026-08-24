# Vitest 前端测试系统精简 - Plan

## 方案概述

保留已完成的 `unit` / `dom` Vitest projects，把测试职责沿六边形边界收敛：领域与 application 规则在 Node 内直接验证，port/adapter 测试验证边界翻译，React 组件作为 UI adapter 只测试用户可观察行为与必要接线。页面消费者不再复测共享组件、第三方组件或下层状态机。

语义 hard cut 分三批执行：Node → 业务 DOM → 平台 DOM。每批内部允许删除、合并、移动测试与调整必要的生产 owner，不保留零消费者兼容 facade；每批结束都执行对应 project、全量测试与静态检查，避免最后一次性定位回归。

## 最终结果

- 测试文件由 201 降至 187，测试项由 1058 降至 886，测试代码由 29,404 行降至 24,076 行（-18.12%）；删除的是重复消费者合同、供应商自测、fixture 自测和实现细节，关键风险迁到唯一 owner 或保留。
- `unit` 为 81 文件/443 项，11.34 秒；`dom` 为 106 文件/443 项，40.76 秒。
- 最终全量三轮为 51.28、54.11、57.00 秒，中位数 54.11 秒，较旧中位数 90.72 秒下降 40.35%。
- 未知 `console.warn` / `console.error` 已建立覆盖整个测试文件生命周期的失败门禁；门禁首次暴露的异步更新、错误 Provider、错误 focus 与测试替身问题均在具体 owner 修复，没有全局白名单。
- `scripts/**/*.test.ts` 保持 Bun runner，通过 `test:scripts` 一次发现并纳入根 `check`；实测 16 文件/150 项通过。

## 日常执行层级

1. 修改单一 owner 时直接运行对应测试文件；本次 Node owner 样本为 69ms。
2. 连续开发使用 `bun run test` watch，让 Vitest 按已加载依赖图重跑。
3. 只知道生产源文件且依赖扇出较窄时使用 `bun run test:related <source>`；窄样本为 3.66 秒。共享 barrel 源文件可能命中大量消费者，不把该命令当固定 SLA。
4. 一个功能切片收口时运行 `test:unit` 或 `test:dom`；修改 `scripts/**` 时运行 `test:scripts`；跨边界阶段收口运行 `test:run` 全量。
5. `test:changed` 只作工作树预检，不替代 owner、project 或全量门禁。

## 备选方案与取舍

| 方案 | 结论 | 原因 |
| --- | --- | --- |
| 保留 Vitest + RTL，收敛测试 owner | 采用 | 现有 Node project 已足够快，当前慢点来自 DOM 职责与 mock，而不是 runner 能力 |
| 增加 Vitest Browser Mode | 暂不采用 | 真实浏览器更准确，但启动更慢且当前没有 JSDOM 失真导致的未解决缺陷；出现真实证据后再做窄试点 |
| 引入 Playwright Component Testing | 放弃 | 需要 gallery、stories、浏览器运行时与第二套执行模型；无 CI 且以本地快速反馈为主时维护成本过高 |
| 切换 Jest、Bun test 或 happy-dom | 放弃 | 不能消除重复语义 owner；happy-dom 也不能等价保证 React Aria/HeroUI 焦点与事件 |
| 按百分比删测试 | 放弃 | 会诱导删除便宜且有价值的 Node 风险合同；数量不是质量或速度的可靠代理 |
| 一个行为一个风险 owner | 采用 | 让失败位置、重构边界和删除判断都可解释，消费者只保留接线 smoke |
| 批量改 HeroUI 子路径导入 | 放弃 | 已无隔离 A/B 证据证明它是主要耗时来源，并显著损害当前代码可读性 |
| 批量重命名全部测试后缀 | 放弃 | 运行时收益为零、diff 巨大；只在触及错误环境归属文件时改正 |

## 测试职责与依赖方向

```text
领域 / application / port 规则
        │  Node tests
        ▼
React UI adapter / component owner
        │  少量 JSDOM integration tests
        ▼
Shell / route / Tauri runtime
           手工真实冒烟
```

依赖方向遵循生产架构：UI 测试可以用稳定 port/fake 驱动 application，但不得通过 feature barrel 的部分真实 mock 拉入整棵实现；通用 selection、bulk result、metadata、Tooltip、Overlay、autosave 等合同只由所属模块验证一次。消费者只断言自己负责的输入、输出和接线。

## 保留与删除规则

### 保留

- 领域不变量、状态机、codec、数据迁移、排序与投影。
- Port/adapter command、payload、序列化、错误映射与信任边界。
- 并发、竞态、自动保存、迟到事件、失败恢复与数据丢失防护。
- 删除、覆盖、取消等危险操作及确认策略。
- 创建、提交、导航、搜索、命令执行等关键用户路径。
- 键盘、焦点、Overlay、屏幕阅读语义及真实历史回归。

### 删除或合并

- HeroUI/ListView 自身挂载、CSS、版本与内部 DOM 合同。
- Tailwind class、`data-slot`、内部 children 结构和精确 mock 调用次数。
- 消费者重复的 Tooltip、Popover、日期选项、快捷键目录与共享状态转换。
- 没有调用生产代码的自证测试、一行委托、透传组件与测试 fixture 自测。
- 没有墙钟或性能阈值的 benchmark 组件装配。
- 只证明已删除旧 UI 不存在的永久兼容性断言。

## Test double 与 helper 约束

1. 默认直接提供消费者需要的精确导出，不使用 `importOriginal` 加载整棵 feature。
2. 模拟 compound/trigger 组件时必须传递公开 props 与 ref；如果实现这一合同比使用真实组件更复杂，就使用真实组件或把业务规则移到 Node。
3. `renderWithRouter` 默认只提供 Router 与不重试、不创建 GC timer 的局部 QueryClient；Command/Task/Selection providers 由真实消费者显式 opt-in。
4. Provider、registry、store 与 fake timer 不共享可变跨测试状态；局部创建、局部清理。
5. 共享 helper 只有在至少三个稳定消费者减少重复并保持语义清晰时才创建；本任务不建设测试框架。

## Console 门禁

先修复所有现有 warning/error 的真实来源：错误 ref mock、未 await router 更新、错误媒体查询模型、生产 debug 输出与预期失败输出。随后在 Vitest 的统一入口接管整个文件生命周期，分别检查收集/文件收尾与单个用例中的未知 `console.warn` / `console.error`；预期输出必须在具体测试内 `spyOn`、静默并断言精确次数。不得使用 `--silent`，因为它会掩盖 React 与无障碍回归信号。

## 执行顺序

1. **Node hard cut**：删除假测试和 fixture 自测，合并 bulk/update/selection 等重复 owner，精简 command adapter 样板；完整运行 unit 与全量。
2. **业务 DOM hard cut**：收敛 CommandMenu、TaskBoard、TaskRowAdapter、TaskCreateContent 与 metadata owner，删除第三方 Collection contract 和空壳页面测试；完整运行 dom 与全量。
3. **平台 DOM hard cut**：修 setup/router helper/test double，收敛 LauncherPage、SettingsPage、ShellSidebar 与共享 Tooltip/样式重复，删除供应商与透传测试；建立 console 门禁并完整运行 dom 与全量。
4. **测量收口**：连续三轮运行全量，记录 project/文件/测试数、阶段前后中位数与波动；若没有实测收益，优先继续找 top slow owner，不增加 worker/pool/config 复杂度。

## 风险

- 删除消费者测试可能暴露 owner 实际缺少合同；先把独立风险迁到正确 owner，再删除重复断言。
- 页面测试缩减可能漏掉跨 provider 接线；每个页面至少保留能证明 route/input/action 接通的最小 smoke。
- 全局 console 门禁可能首先暴露第三方噪声；不得建立大范围白名单，应修错误替身或由具体测试局部接管。
- 三批并行修改可能触及同一 helper；按文件所有权隔离，合并后由根级全量验证统一处理。
- 全量耗时受本机竞争影响；只比较同机连续样本中位数，不固化跨机器绝对 SLA。

## 完成后需要同步的长期文档

- 在根级 `ARCHITECTURE.md` 的测试章节记录 Node/DOM 职责、风险 owner 和日常/全量门禁边界；如果现有章节足够，只做最小补充。
- 更新 `Documents/_INDEX.md` 与 HeroUI 原任务 `TASKS.md`，在本任务完成前保持阶段 K 暂停。
- 不创建 ADR：该决策使用 Vitest 原生能力、可局部回退，也不满足“难以逆转”的门槛。
