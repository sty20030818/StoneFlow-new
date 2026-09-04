# 03：完成列表引擎实测与单轨 Hard Cut

**What to build:** 在完全相同的 Row、Header、collection state、cursor pages 与业务动作下，对优化后的虚拟列表和一次性普通列表候选进行真实 WKWebView/WebView2 比较，根据可复核证据只保留一个生产引擎，并删除失败候选、临时测量面、孤儿依赖与所有双轨代码。

**Blocked by:** 02 — 修正 TaskBoard 虚拟化与 React 热路径

**Status:** completed; archived; real-app acceptance transferred

**2026-09-04 归档决定：** 用户明确授权先修 UI Lab 超长测试，然后直接归档。工程实现与单轨裁决已完成；UI Lab 长链路测试按行为拆分并保留原断言，恢复默认 timeout，单文件 26 项与连续两轮全量 `bun run test:run` 193 个文件、982 项均通过。原“双平台证据是本 ticket 完成门”的归档阻断口径由本次决定替代；下列未执行矩阵保持未勾选，交接[统一产品验收](../../../unified-product-acceptance/spec.md)，不表示验收通过。

**2026-09-03 裁决：** 保留优化后的 TanStack Virtual 单轨。ordinary candidate 在与 virtual 相同的 production build、设备、环境元数据和 viewport 下，`loaded:2000` 连续两次超过 5 秒双帧绘制门禁；virtual 同场景及 `loaded:10000`、`paged:150-600` 均完成。按预先定义的停止规则，不再运行不会改变裁决的 ordinary 10,000 与分页样本。

**可复核证据：** [成功结果 JSON](../evidence/task-board-benchmark-macos-16c7ebd0.json)、[ordinary 失败记录](../evidence/task-board-benchmark-macos-16c7ebd0-failures.json) 与 [运行摘要及 SHA-256](../evidence/task-board-benchmark-macos-16c7ebd0.md)。一次性 production benchmark 构建与运行入口已在保存证据后删除。

**已转交、尚未完成的真实验收：** Windows WebView2、两平台最低支持 WebView、原生触控板 fling / 反向 fling / scrollbar thumb drag、真实产品 Context Menu 与详情返回焦点、平台 trace、原始 React profiling 数据及长时进程内存/DOM。它们只继续验收最终 virtual 路径，不恢复双引擎，也不再阻塞本包归档。

- [x] 修复现有 performance harness：Long Tasks 使用 50ms 门槛，paged fixture 能真实追加并结束请求，Row 保持生产 Context Menu、metadata 与 selection 成本，覆盖 150、300、600、2,000 和 10,000 个已加载富 Row。
- [ ] 测量前固定 production build、设备与最低支持 WebView、viewport、seed、数据量、重复次数、采集指标和胜负规则；不同引擎必须在同一条件下运行，原始结果可复核。
- [x] 先记录 Ticket 02 优化后虚拟路径基线，再建立只存在于 benchmark surface 的 ordinary-list candidate；候选复用 RowShell、RowLayout、BoardRowSlot、BoardSectionHeader、CollectionBody、collection state、cursor pagination 和业务 actions，只替换 layout strategy。
- [ ] 同一 production build、设备、数据与 viewport 下覆盖 native trackpad fling、反向 fling、scrollbar thumb drag、连续 J/K/Arrow、range selection、折叠/展开、Context Menu 焦点恢复、详情返回焦点、分页追加、错误 retry 和长时内存/DOM 增长。
- [ ] macOS WKWebView 与 Windows WebView2 分别记录 scripting、style/layout、paint、50ms long tasks、React commit、mounted Row、fetch 次数和人工跟手感；Chrome/Vite、jsdom、合成 scrollTop 或单一平台结果不替代真实桌面证据。
- [x] ordinary candidate 只有在产品可达的 10,000 个富 Row、两类最低支持 WebView、keyboard/focus/paging 矩阵均不劣于优化后虚拟路径，且内存与 DOM 增长可接受时才胜出；任一高量级或交互合同失败则保留优化后虚拟路径。
- [x] macOS 或 Windows 证据缺失、结果打平、指标互相矛盾或仍无法判定时，默认保留 Ticket 02 已优化的虚拟路径并删除 ordinary candidate；原定双平台人工完成门已按 2026-09-04 归档决定转交统一产品验收，不新增第四个 ticket，也不以双轨等待未来决定。
- [x] ordinary 胜出时 clean cut 删除 TanStack virtualizer、virtual-only extent/offset/range/sticky/focus bridge 及零消费者依赖；virtual 胜出时删除 ordinary candidate 与其全部分支，同时保留稳定的产品焦点恢复合同。
- [x] 最终生产代码不存在 small/large threshold、feature flag、renderer switch、兼容 alias、双测试矩阵或无退出条件的实验旁路。
- [x] 决策完成并保存原始结果后，删除 benchmark-only access gate、route/route test、redirect、page/export、performance fixtures/tests、生成路由入口、报告 glue、临时开关和失败候选；本地工作包只保留可复核结论与必要原始证据。
- [x] 若 ordinary 胜出且 `@tanstack/react-virtual` 已无消费者，使用现有 Bun 工具链删除依赖并同步 lockfile；若 virtual 胜出，不做无关依赖升级或版本迁移。
- [x] 最终同步系统设计、界面系统、HeroUI 平台 ADR 与相关模块架构，使它们只描述胜出引擎、最终 scroll/ARIA/focus 合同和真实平台证据边界，不保留中间阶段 wording。
- [x] 自动化重新覆盖所有 Task/Project/Lifecycle Board 行为、loaded pagination、selection/focus、Context Menu、详情返回与 560px 紧凑排版；失败候选的实现形状测试随候选一起删除，仍有效的行为测试迁移到最终公共边界。
- [x] 运行根级 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun run test:run`、`bun run test:scripts`、`bun run test:release`、`bun run build` 与 `git diff --check`，并分别报告自动化、浏览器、macOS WKWebView、Windows WebView2 与人工验收结果；缺失平台不得写成已通过。

  2026-09-03 核心 Board 测试、类型、lint、边界、格式、脚本、release、Rust 与 build 均通过，但全量 Vitest 的 `UiLabApp` 跨工作台长链路用例曾连续两次在默认并发下超时。2026-09-04 将该用例拆成五条独立行为用例，测试文件原有 318 处 matcher 断言及顺序全部保留，移除单用例 10 秒覆盖并恢复默认 timeout；未调整 worker、增加重试或跳过断言。

  本轮 UI Lab 单文件 26 项通过；默认并发全量两轮均为 193 个文件、982 项通过（31.61 秒、28.84 秒）；`bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、脚本测试 168 项、release 测试 146 项、`bun run build` 与 `git diff --check` 均通过。lint 仍有既有 React 警告，构建仍报告依赖 BigInt 目标兼容及 chunk 大小警告，不将构建成功当作最低 WebView 已验证。本轮未重跑浏览器、Tauri 或 Rust；既有 macOS 实测以归档原始证据为准。Windows、最低版本 WebView、原生交互、平台 trace、原始 React profiling 数据及长时内存/DOM 已交接统一产品验收，仍未执行。
