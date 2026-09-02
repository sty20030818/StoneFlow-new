# 03：完成列表引擎实测与单轨 Hard Cut

**What to build:** 在完全相同的 Row、Header、collection state、cursor pages 与业务动作下，对优化后的虚拟列表和一次性普通列表候选进行真实 WKWebView/WebView2 比较，根据可复核证据只保留一个生产引擎，并删除失败候选、临时测量面、孤儿依赖与所有双轨代码。

**Blocked by:** 02 — 修正 TaskBoard 虚拟化与 React 热路径

**Status:** in-progress

**临时 production benchmark 构建：** `bun run tauri build --config src-tauri/tauri.task-board-benchmark.conf.json --features task-board-benchmark --no-bundle`。构建脚本拒绝 dirty worktree，并把当前 `HEAD` 自动写入报告环境；不得手填或复用其它 commit。

- [x] 修复现有 performance harness：Long Tasks 使用 50ms 门槛，paged fixture 能真实追加并结束请求，Row 保持生产 Context Menu、metadata 与 selection 成本，覆盖 150、300、600、2,000 和 10,000 个已加载富 Row。
- [ ] 测量前固定 production build、设备与最低支持 WebView、viewport、seed、数据量、重复次数、采集指标和胜负规则；不同引擎必须在同一条件下运行，原始结果可复核。
- [ ] 先记录 Ticket 02 优化后虚拟路径基线，再建立只存在于 benchmark surface 的 ordinary-list candidate；候选复用 RowShell、RowLayout、BoardRowSlot、BoardSectionHeader、CollectionBody、collection state、cursor pagination 和业务 actions，只替换 layout strategy。
- [ ] 同一 production build、设备、数据与 viewport 下覆盖 native trackpad fling、反向 fling、scrollbar thumb drag、连续 J/K/Arrow、range selection、折叠/展开、Context Menu 焦点恢复、详情返回焦点、分页追加、错误 retry 和长时内存/DOM 增长。
- [ ] macOS WKWebView 与 Windows WebView2 分别记录 scripting、style/layout、paint、50ms long tasks、React commit、mounted Row、fetch 次数和人工跟手感；Chrome/Vite、jsdom、合成 scrollTop 或单一平台结果不替代真实桌面证据。
- [ ] ordinary candidate 只有在产品可达的 10,000 个富 Row、两类最低支持 WebView、keyboard/focus/paging 矩阵均不劣于优化后虚拟路径，且内存与 DOM 增长可接受时才胜出；任一高量级或交互合同失败则保留优化后虚拟路径。
- [ ] macOS 或 Windows 证据缺失、结果打平、指标互相矛盾或仍无法判定时，默认保留 Ticket 02 已优化的虚拟路径并删除 ordinary candidate；双平台证据是本 ticket 的人工完成门，不新增第四个 ticket，也不以双轨等待未来决定。
- [ ] ordinary 胜出时 clean cut 删除 TanStack virtualizer、virtual-only extent/offset/range/sticky/focus bridge 及零消费者依赖；virtual 胜出时删除 ordinary candidate 与其全部分支，同时保留稳定的产品焦点恢复合同。
- [ ] 最终生产代码不存在 small/large threshold、feature flag、renderer switch、兼容 alias、双测试矩阵或无退出条件的实验旁路。
- [ ] 决策完成并保存原始结果后，删除 benchmark-only access gate、route/route test、redirect、page/export、performance fixtures/tests、生成路由入口、报告 glue、临时开关和失败候选；本地工作包只保留可复核结论与必要原始证据。
- [ ] 若 ordinary 胜出且 `@tanstack/react-virtual` 已无消费者，使用现有 Bun 工具链删除依赖并同步 lockfile；若 virtual 胜出，不做无关依赖升级或版本迁移。
- [ ] 最终同步系统设计、界面系统、HeroUI 平台 ADR 与相关模块架构，使它们只描述胜出引擎、最终 scroll/ARIA/focus 合同和真实平台证据边界，不保留中间阶段 wording。
- [ ] 自动化重新覆盖所有 Task/Project/Lifecycle Board 行为、loaded pagination、selection/focus、Context Menu、详情返回与 560px 紧凑排版；失败候选的实现形状测试随候选一起删除，仍有效的行为测试迁移到最终公共边界。
- [ ] 运行根级 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun test:run`、`bun run test:scripts`、`bun run test:release`、`bun run build` 与 `git diff --check`，并分别报告自动化、浏览器、macOS WKWebView、Windows WebView2 与人工验收结果；缺失平台不得写成已通过。
