# 03：完成列表引擎实测与单轨 Hard Cut

**What to build:** 在完全相同的 Row、Header、collection state、cursor pages 与业务动作下，对优化后的虚拟列表和一次性普通列表候选进行真实 WKWebView/WebView2 比较，根据可复核证据只保留一个生产引擎，并删除失败候选、临时测量面、孤儿依赖与所有双轨代码。

**Blocked by:** 02 — 修正 TaskBoard 虚拟化与 React 热路径

**Status:** in-progress

**2026-09-03 裁决：** 保留优化后的 TanStack Virtual 单轨。ordinary candidate 在与 virtual 相同的 production build、设备、环境元数据和 viewport 下，`loaded:2000` 连续两次超过 5 秒双帧绘制门禁；virtual 同场景及 `loaded:10000`、`paged:150-600` 均完成。按预先定义的停止规则，不再运行不会改变裁决的 ordinary 10,000 与分页样本。

**可复核证据：** [成功结果 JSON](../evidence/task-board-benchmark-macos-16c7ebd0.json)、[ordinary 失败记录](../evidence/task-board-benchmark-macos-16c7ebd0-failures.json) 与 [运行摘要及 SHA-256](../evidence/task-board-benchmark-macos-16c7ebd0.md)。一次性 production benchmark 构建与运行入口已在保存证据后删除。

**仍未完成的人工门：** Windows WebView2、两平台最低支持 WebView、原生触控板 fling / 反向 fling / scrollbar thumb drag、真实产品 Context Menu 与详情返回焦点、平台 trace、长时进程内存。它们只继续验收最终 virtual 路径，不恢复双引擎。

- [x] 修复现有 performance harness：Long Tasks 使用 50ms 门槛，paged fixture 能真实追加并结束请求，Row 保持生产 Context Menu、metadata 与 selection 成本，覆盖 150、300、600、2,000 和 10,000 个已加载富 Row。
- [ ] 测量前固定 production build、设备与最低支持 WebView、viewport、seed、数据量、重复次数、采集指标和胜负规则；不同引擎必须在同一条件下运行，原始结果可复核。
- [x] 先记录 Ticket 02 优化后虚拟路径基线，再建立只存在于 benchmark surface 的 ordinary-list candidate；候选复用 RowShell、RowLayout、BoardRowSlot、BoardSectionHeader、CollectionBody、collection state、cursor pagination 和业务 actions，只替换 layout strategy。
- [ ] 同一 production build、设备、数据与 viewport 下覆盖 native trackpad fling、反向 fling、scrollbar thumb drag、连续 J/K/Arrow、range selection、折叠/展开、Context Menu 焦点恢复、详情返回焦点、分页追加、错误 retry 和长时内存/DOM 增长。
- [ ] macOS WKWebView 与 Windows WebView2 分别记录 scripting、style/layout、paint、50ms long tasks、React commit、mounted Row、fetch 次数和人工跟手感；Chrome/Vite、jsdom、合成 scrollTop 或单一平台结果不替代真实桌面证据。
- [x] ordinary candidate 只有在产品可达的 10,000 个富 Row、两类最低支持 WebView、keyboard/focus/paging 矩阵均不劣于优化后虚拟路径，且内存与 DOM 增长可接受时才胜出；任一高量级或交互合同失败则保留优化后虚拟路径。
- [x] macOS 或 Windows 证据缺失、结果打平、指标互相矛盾或仍无法判定时，默认保留 Ticket 02 已优化的虚拟路径并删除 ordinary candidate；双平台证据是本 ticket 的人工完成门，不新增第四个 ticket，也不以双轨等待未来决定。
- [x] ordinary 胜出时 clean cut 删除 TanStack virtualizer、virtual-only extent/offset/range/sticky/focus bridge 及零消费者依赖；virtual 胜出时删除 ordinary candidate 与其全部分支，同时保留稳定的产品焦点恢复合同。
- [x] 最终生产代码不存在 small/large threshold、feature flag、renderer switch、兼容 alias、双测试矩阵或无退出条件的实验旁路。
- [x] 决策完成并保存原始结果后，删除 benchmark-only access gate、route/route test、redirect、page/export、performance fixtures/tests、生成路由入口、报告 glue、临时开关和失败候选；本地工作包只保留可复核结论与必要原始证据。
- [x] 若 ordinary 胜出且 `@tanstack/react-virtual` 已无消费者，使用现有 Bun 工具链删除依赖并同步 lockfile；若 virtual 胜出，不做无关依赖升级或版本迁移。
- [x] 最终同步系统设计、界面系统、HeroUI 平台 ADR 与相关模块架构，使它们只描述胜出引擎、最终 scroll/ARIA/focus 合同和真实平台证据边界，不保留中间阶段 wording。
- [x] 自动化重新覆盖所有 Task/Project/Lifecycle Board 行为、loaded pagination、selection/focus、Context Menu、详情返回与 560px 紧凑排版；失败候选的实现形状测试随候选一起删除，仍有效的行为测试迁移到最终公共边界。
- [ ] 运行根级 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun test:run`、`bun run test:scripts`、`bun run test:release`、`bun run build` 与 `git diff --check`，并分别报告自动化、浏览器、macOS WKWebView、Windows WebView2 与人工验收结果；缺失平台不得写成已通过。

  当前核心 Board 测试、类型、lint、边界、格式、脚本、release、Rust 与 build 均通过。全量 Vitest 连续两次仅 `UiLabApp` 的跨全工作台长链路用例在默认并发下超过其 10 秒上限，单独运行该用例通过；该门禁仍按失败保留，不以放宽断言、跳过或盲目增加 timeout 掩盖。Windows、最低版本 WebView、原生交互与平台 trace 仍待外部验收。
