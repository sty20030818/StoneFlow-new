# StoneFlow 长列表与虚拟化长期选型研究

> 日期：2026-09-02
> 范围：只调查 TaskBoard 的滚动、分页、sticky、焦点与虚拟化策略；不修改生产代码或长期架构文档。
> 证据边界：下文把“当前代码事实”“官方资料事实”“基于静态代码的推断”“仍需真实 WebView 验证”分开表述。

## 结论先行

推荐先保留 **TaskBoard 单一虚拟化路径**，但重构现有虚拟化外围协议；不要继续保留“把尚未加载的数据伪装成可滚动总高度”的巨大空 spacer，也不要引入“少量普通列表、超过阈值再切虚拟列表”的双运行时。

最值得优先落地的方向是：

1. 虚拟化范围只覆盖**已加载的真实 header/row**，尾部只保留一个小型 load-more sentinel。当前后端是 cursor 分页，并不支持按任意 index 直接跳页；因此把 10,000 条总量提前映射成约 46 万 px 的可滚动高度，会制造并不存在的随机访问能力。
2. 保持 44px row、36px header 的固定高度快路径，不增加动态高度测量。只有产品明确需要多行标题、行内展开等能力时，才重新评估 `measureElement`/`ResizeObserver`。
3. 以真实 macOS WKWebView 和 Windows WebView2 的 native fling/滚动条拖拽 profile 决定 overscan、sticky 与 row mount 优化；不要把 overscan 调大当成通用修复。
4. 做一个一次性的普通列表 A/B 原型作为**决策门**，而不是把两套 renderer 长期放进生产。若普通列表在真实最大常用 loaded count 下通过预算，就 clean cut 删除虚拟化；否则保留简化后的虚拟化。
5. Task、Project、Lifecycle 应共享 Row/GroupHeader 的视觉与交互语义，但不必强迫使用同一个 layout engine。样式统一和是否虚拟化是两个正交决策。

换句话说：当前最优路线不是“原样保留虚拟列表”，也不是“凭体感立刻删掉虚拟列表”，而是**先删除错误的假总高度，再用真实 WebView 证据在一个生产策略上做 clean cut**。

## Ticket 02 实施前基线（历史证据）

本节记录方案形成时的旧实现，供核对 Ticket 02 删除范围；当前生产契约以模块架构与 Ticket 02 实施结果为准。

### 依赖与运行时版本

- 项目声明 `@tanstack/react-virtual ^3.14.10`、React `19.2.8`、`react-aria 3.51.0`、`react-aria-components 1.20.0`、`react-stately 3.49.0`；HeroUI 为 `3.2.4`，HeroUI Pro 为 `1.0.0-beta.8`。[package.json](../../package.json#L33-L60)
- lock 实际解析为 `@tanstack/react-virtual 3.14.10` + `@tanstack/virtual-core 3.17.8`。[bun.lock](../../bun.lock#L419-L431) 对应 core 的一手实现可见 [TanStack `virtual-core@3.17.8` source](https://github.com/TanStack/virtual/blob/%40tanstack%2Fvirtual-core%403.17.8/packages/virtual-core/src/index.ts)。

### TaskBoard 已经是固定高度快路径

- row 高 44px、header 高 36px、gap 2px，模型手工计算每项 offset 和总高度。[taskBoardModel.ts](../../src/features/task/model/taskBoardModel.ts#L11-L17) [taskBoardModel.ts](../../src/features/task/model/taskBoardModel.ts#L118-L135)
- TanStack 当时显式配置 `measureElement: undefined`、`overscan: 6`，以固定估算高度和绝对定位渲染。[TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx)
- 因此，当前问题不是“动态高度测量太慢”。反而，后续若引入动态高度，会新增测量、校正和滚动位置稳定性问题。TanStack 官方要求动态列表提供估算并测量真实元素，[Virtualizer API](https://tanstack.com/virtual/latest/docs/api/virtualizer#estimatesize)；React Aria 也明确说明观察动态 item size 内部使用 `ResizeObserver`，可能有性能开销，[React Aria Virtualizer](https://react-aria.adobe.com/Virtualizer#dynamic-item-sizes)。

### 当时已确认的结构问题：巨大空 spacer

- 服务端默认每页只返回 150 条，并通过 cursor 续页。[view service](../../src-tauri/crates/application/src/view/service.rs#L34) [view service](../../src-tauri/crates/application/src/view/service.rs#L395-L427)
- TaskBoard 将 `totalCount - loadedCount` 乘以 46px，合并成一个尾部 spacer。[taskBoardModel.ts](../../src/features/task/model/taskBoardModel.ts#L147-L180)
- 这个 spacer 在 TanStack 中只是**一个超高 item**，渲染时明确只占位、不显示业务 UI；看到它以后才触发下一页请求。[TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx#L528-L544) [TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx#L656-L697)
- 以 10,000 条总量、首屏 150 条为例，未加载区约为 `(10,000 - 150) × 46 = 453,100px` 空白。用户快速拖到底部时可以直接落入这个空 item，但 cursor API 无法直接取“当前滚动深度对应的第 N 页”，只能从现有 cursor 一页页追赶。

**判断：**“快速滑动不跟手”至少包含一个已确认的产品语义问题——滚动条承诺了尚不可访问的位置。至于是否还同时存在 React render、layout/paint 或 WebKit 主线程卡顿，静态代码不能证明，必须另做 profile。

### sticky 与虚拟化叠了两套机制

- `rangeExtractor` 强制保留当前与下一个 header，这本身是 TanStack 官方允许的 sticky 用法。[TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx#L260-L280) [TanStack rangeExtractor](https://tanstack.com/virtual/latest/docs/api/virtualizer#rangeextractor)
- 此外，StoneFlow 又监听 scroll、用 RAF 计算顶替位置、直接写 transform/visibility，并在分区变化时 setState。[useTaskBoardSticky.ts](../../src/features/task/hooks/useTaskBoardSticky.ts#L37-L108)
- 最终 DOM 还复制了一份零高度 sticky header overlay，并把原 header 设为 `aria-hidden`/`inert`。[TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx#L586-L655)
- TanStack 官方 sticky 示例使用自定义 `rangeExtractor` 保留 active header，并让同一个 active item 使用 `position: sticky`，其余 item 绝对定位；这证明可以先原型验证更短的单实例路径，但不证明 StoneFlow 的分组顶替、ContextMenu 和焦点合同可以未经验收直接照搬。[TanStack sticky example](https://tanstack.com/virtual/latest/docs/framework/react/examples/sticky)

**静态推断，待 profile：**TanStack 的可视范围更新、StoneFlow sticky RAF、富 Row 的 mount/unmount 都发生在滚动期间，可能共同放大卡顿。不能在没有 flame chart 的情况下把责任单独归给 TanStack。

### Row 本身不是轻量文本节点

`TaskRowAdapter` 包含 ContextMenu、选择控件、多个 metadata dropdown/date/placement 控件、Tooltip 和命令投影；它虽然已经用 `memo` 与自定义 comparator 避免无关更新，但 mount/unmount 仍有实际成本。[TaskRowAdapter.tsx](../../src/features/task/components/TaskRowAdapter.tsx#L77-L115) [TaskRowAdapter.tsx](../../src/features/task/components/TaskRowAdapter.tsx#L233-L383)

这也是不能仅凭“普通 DOM 更简单”就推断 2,000–10,000 个已加载富 Row 一定更快的原因。

另有一个可独立清理的小热点：每个已挂载 Row 都通过 `navigableKeys.indexOf(task.id)` 线性查找 `aria-rowindex`。[TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx#L859-L893) 它不太可能单独解释滚动体验，但可由 projection 预生成 key→index 映射，避免在滚动挂载路径反复扫描同一数组；是否落地仍应以 profile/基准为准。

### Project/Lifecycle 当前走普通文档流

- `ProjectBoard` 直接 map 全部分组/行，并用原生 CSS `position: sticky` header。[ProjectBoard.tsx](../../src/features/project/components/ProjectBoard.tsx#L83-L110) [ProjectBoard.tsx](../../src/features/project/components/ProjectBoard.tsx#L145-L202)
- `LifecycleBoard` 是相同类型的普通文档流实现。[LifecycleBoard.tsx](../../src/features/lifecycle/components/LifecycleBoard.tsx#L81-L105) [LifecycleBoard.tsx](../../src/features/lifecycle/components/LifecycleBoard.tsx#L136-L193)
- CSS sticky 本来就按最近 scrollport 自动约束位置；这是浏览器原生定位协议。[CSS Positioned Layout Level 3](https://www.w3.org/TR/css-position-3/#sticky-position)

因此三类页面的样式不一致并不神秘：它们目前共享到 RowShell/collection 语义层，但 Board、GroupHeader 和 layout 层并不是同一个组件。修复样式漂移应提炼共享 Row/GroupHeader recipe，而不是为了“同组件”强迫 Project/Lifecycle 一起虚拟化。

## 三条路线比较

| 路线 | 正确性与体验 | 性能上限 | 复杂度 | 长期判断 |
|---|---|---|---|---|
| A. 简化并保留虚拟化 | 固定高度、真实 loaded extent、loader sentinel 后，滚动语义可恢复；离屏 focus 仍需虚拟化合同 | DOM 数量有界，适合 2,000+ 已加载富 Row | 中；需保留 geometry/focus/ARIA，但可删除假 spacer、双层 skip、部分 sticky 代码 | **当前推荐生产方向** |
| B. 普通列表 + 增量分页 | 最接近原生滚动、CSS sticky、真实 DOM 焦点；无虚拟空白 | 组件实例与 DOM 随已加载页持续增长；10,000 个富 Row 风险高 | 最低；若实测通过，可删除 TanStack、手工 extent、focus bridge | **推荐一次性 A/B，达标则 clean cut** |
| C. 按数量阈值运行时切换 | 在跨阈值时 DOM、scroll position、sticky 与 focus owner 都会换轨 | 小列表可能省开销，大列表仍虚拟 | 最高；两条路径、两套回归矩阵、模式切换故障 | **不推荐** |
| D. 改用 React Aria Virtualizer | 官方组件把 collection 与 layout 绑定，支持 fixed/variable rows、heading/loader size | 面向大型 collection | 迁移 collection/section/sticky/overlay 合同，不能只换一个 hook | **只作为未来整层重写候选，不是本轮首选** |

React Aria 官方 Virtualizer 的价值是只将可见 item 放入 DOM，并提供固定/变量 row、heading 和 loader 几何；这与 StoneFlow 所需能力方向一致。[React Aria Virtualizer](https://react-aria.adobe.com/Virtualizer) 但它不会自动修复 StoneFlow 当前“cursor 分页却伪造随机访问总高度”的上层协议，所以不应把换库当作第一步。

## 关键维度

### 1. 滚动跟手性与 overscan

TanStack 对 overscan 的官方定义很明确：增加 overscan 会增加渲染时间，但可能减少快速滚动时边缘出现空白 item 的概率；默认值为 1。[TanStack Virtualizer overscan](https://tanstack.com/virtual/latest/docs/api/virtualizer#overscan)

StoneFlow 当前值为 6。由于 Row 很重，继续无依据地升到 10/20 可能让每次高速滚动需要 mount 更多 ContextMenu/Dropdown 子树。正确做法是：

- 先删除 giant spacer，避免把“真实数据不存在”误判成 overscan blank；
- 再在相同 production build、相同 viewport、相同 native fling 下对 4/6/8 做 A/B；
- 同时记录 React commit、style/layout/paint 和 mounted row，而不是只看主观感觉。

React `<Profiler>` 能给出 subtree 的 `actualDuration`/`baseDuration`，但 production 默认禁用，需要 profiling build；它只能解释 React render，不能替代浏览器 layout/paint timeline。[React Profiler](https://react.dev/reference/react/Profiler) Tauri 的 inspector 在 macOS 是 Safari Inspector、Windows 是 Edge DevTools，正好用于补全平台渲染证据。[Tauri debug](https://v2.tauri.app/develop/debug/#webview-console)

### 2. 动态高度

推荐继续冻结固定高度：

- 当前所有 offset、sticky push、scrollToIndex 都依赖 44/36px 常量；固定高度没有测量误差与滚动校正。[taskBoardModel.ts](../../src/features/task/model/taskBoardModel.ts#L11-L17)
- React Aria 官方说明 variable row 需要合理 `estimatedRowSize`，动态观察使用 ResizeObserver 且可能有额外开销。[React Aria Virtualizer list layout](https://react-aria.adobe.com/Virtualizer#list) [dynamic item sizes](https://react-aria.adobe.com/Virtualizer#dynamic-item-sizes)
- TanStack 也需要 `measureElement`，当视口上方 item 的真实尺寸与估算不同时还涉及 scroll-position adjustment。[TanStack measureElement](https://tanstack.com/virtual/latest/docs/api/virtualizer#measureelement)

除非新的产品要求明确改变 row 高度，否则“为了通用”引入动态测量只会扩大状态空间。

### 3. sticky group header

- 普通列表优先用单一真实 header + CSS sticky。
- 虚拟列表先验证 TanStack 官方的“一份 active header DOM”模式；只有当分组顶替视觉、ContextMenu、VoiceOver 与焦点恢复确实需要 overlay 时才保留自定义层。
- 无论 layout engine 如何，Header 的视觉、按钮顺序、accessible name、count/selection chip 应来自同一共享组件；虚拟化层只负责 position/visibility，不拥有皮肤。

这能同时解决用户看到的样式漂移，并避免把样式统一与虚拟化选型绑死。

### 4. 焦点、键盘与 a11y

当 grid 只把部分行放进 DOM 时，WAI-ARIA 要求用 `aria-rowcount` 表达总行数，并在现存行上使用 `aria-rowindex`；如果所有行都在 DOM，用户代理可以自己计算。[WAI-ARIA Grid and Table Properties](https://www.w3.org/WAI/ARIA/apg/practices/grid-and-table-properties/#using-aria-rowcount-and-aria-rowindex)

StoneFlow 当前虚拟路径手工设置 `aria-rowcount`，每行通过 React Aria `useGridListItem({isVirtualized: true})` 再手工设置 row index，并通过 focus bridge 等待 offscreen row mount 后聚焦。[TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx#L612-L622) [TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx#L859-L893)

这里还有一个已确认的语义缺口：当前 `aria-rowcount` 取的是 `projection.navigableKeys.length`，即已加载、当前可导航的 row 数，而不是服务端已知的 `totalCount`。[TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx#L612-L622) 在所有分组展开、`totalCount` 表示完整过滤结果的 150/10,000 分页场景下，它会向辅助技术报告 150 行。按 WAI-ARIA 的规则，完整可用总量已知时应报告该总量，未知时才使用 `-1`；若折叠分组会改变“可用行”的定义，则产品还需先明确折叠行是否属于 collection，而不能机械地把服务端任务数填进去。删除假 spacer 后仍应保留这份可访问集合语义，不能把“视觉 scroll extent”与“可访问 collection size”一起删掉。

取舍如下：

- 普通**全量**列表可删除大部分 offscreen focus bridge 与手工 geometry；
- 普通**增量分页**列表仍只表示总集合的一部分，因此不能草率删除总量/位置语义；
- 虚拟路径必须验收 J/K、Arrow、Home/End、跨 mount 边界 range selection、ContextMenu 关闭后的真实 DOM focus restore，而不能只验证 selection state。

React Aria 官方 Virtualizer 会把 collection 和 layout 组合起来，并要求 layout orientation 与 collection orientation 一致以保证键盘行为。[React Aria Virtualizer orientation](https://react-aria.adobe.com/Virtualizer#list) 这使它成为未来减少手工 bridge 的候选，但 StoneFlow 的自定义 group re-entry、row shortcut、overlay 恢复仍需完整迁移验证。

### 5. 普通列表的 `content-visibility`

CSSWG 明确把 `content-visibility: auto` 描述为长列表场景下可考虑的优化，甚至在许多情况下可以替代复杂虚拟列表；同时也警告，内容尺寸依赖子树时可能导致 scrollbar jump。[CSS Containment Level 2](https://www.w3.org/TR/css-contain-2/#using-cv-auto)

它适合普通列表原型的原因是 StoneFlow Row 已固定高度，可提供稳定 intrinsic size；但要明确：它让浏览器跳过离屏 layout/paint，并不会删除 React 组件实例或 DOM 节点，因此不能等价替代 10,000 个富 Row 的虚拟化。

当前 TaskBoard 已经只 mount 约一个 viewport + overscan，却还给每个虚拟 row 加 `contentVisibility: auto`。[TaskBoard.tsx](../../src/features/task/components/TaskBoard.tsx#L708-L755) 这是“虚拟化上再叠浏览器跳过”的双层优化。其收益没有当前证据，反而需要检查是否造成 WebKit 首帧显现延迟；建议把“删除它”列为 profile 实验，而不是继续默认保留。

### 6. Tauri/WebView 边界

Tauri 不捆绑统一浏览器：Windows 使用可更新的 WebView2/Chromium，macOS 使用随 OS 更新的 WKWebView/WebKit，旧且停止支持的 macOS 不再获得 WebKit 更新。[Tauri WebView versions](https://v2.tauri.app/reference/webview-versions/)

因此以下结果不能互相替代：

- Chrome/Vite 浏览器顺滑，不证明 WKWebView 顺滑；
- 当前 macOS 顺滑，不证明 Windows WebView2；
- JSDOM 单测通过，不证明 momentum scroll、paint 或辅助技术行为；
- 一台新机器的 profile，不证明最低支持 OS 的 WebKit 路径。

长期验收至少覆盖 macOS WKWebView + Windows WebView2；Tauri 官方当前也提供跨平台 WebdriverIO 路径，但真实触控板 momentum/scrollbar drag 仍应保留人工或设备级验收。[Tauri WebDriver](https://v2.tauri.app/develop/tests/webdriver/)

## 现有性能证据为什么不足

仓库有一个历史 performance harness，但它不能证明当前体验已通过：

1. harness 以每 50ms 直接写 `scrollTop` 并手工 dispatch `scroll`，不是触控板 momentum 或滚动条 thumb drag。[历史源码（commit `5e0468a5`）](https://github.com/sty20030818/StoneFlow-new/blob/5e0468a57f0e0618ca83afb155e97eebd17e3b4d/src/features/task/testing/TaskBoardPerformancePage.tsx#L337-L350)
2. 它只把 `>=200ms` 的 entry 记为 long task；W3C Long Tasks API 的标准门槛是 50ms，因此 50–199ms 的明显阻塞会被当前报告过滤掉。[历史源码（commit `5e0468a5`）](https://github.com/sty20030818/StoneFlow-new/blob/5e0468a57f0e0618ca83afb155e97eebd17e3b4d/src/features/task/testing/TaskBoardPerformancePage.tsx#L18-L25) [W3C Long Tasks API](https://www.w3.org/TR/longtasks-1/)
3. paged fixture 的 `onFetchNextPage` 只把 `inFlight` 设为 true，不追加下一页，也不恢复 false，所以它没有覆盖“页追加后 spacer 移动、连续追页、mount 风暴”。[历史源码（commit `5e0468a5`）](https://github.com/sty20030818/StoneFlow-new/blob/5e0468a57f0e0618ca83afb155e97eebd17e3b4d/src/features/task/testing/TaskBoardPerformancePage.tsx#L99-L113)
4. 唯一历史记录来自 2026-08-13 的旧 commit；2,000-row 的 5 秒程序滚动实际多次耗时约 6–7 秒，50 次 focus sample 又大多为 null。[historical result](../../Documents/99-素材/03-验证/heroui-refactor/task-board-performance-before.json#L8-L68) [historical result](../../Documents/99-素材/03-验证/heroui-refactor/task-board-performance-before.json#L120-L172)
5. 既有计划已明确把该基线冻结为历史输入，并注明“不代表当前性能已通过”。[archived plan](../../Documents/98-归档/02-已完成重构/2026-08-12-heroui-ui-interaction-system-refactor/PLAN.md#L516-L525)

这些记录是“需要重建证据”的信号，不应被当成当前回归结论。

## 推荐的决策门与验证矩阵

### 阶段 1：先修正语义，不换引擎

目标架构：

```text
cursor pages -> loaded rows only -> virtual layout -> small loader sentinel
                         \-> totalCount 只用于文案/ARIA，不伪造随机可达高度
```

需要验证：

- 快速滚到底不会进入大片空白，也不会连续追几十页；
- 一次临界区只允许一个 fetch，页追加后 scroll position 不倒退；
- 加载失败时 sentinel/重试可见且不覆盖 sticky；
- 筛选、折叠、selection/focus 仍以 stable key 为真相。

### 阶段 2：虚拟路径减法实验

在同一 commit 上分别测：

1. 当前 sticky overlay vs TanStack 单实例 sticky 原型；
2. virtual row 保留 vs 删除 `content-visibility: auto`；
3. overscan 4/6/8；
4. 150、300、600、2,000 个真实富 Row；
5. native trackpad 快速 fling、反向 fling、滚动条拖拽、连续 J/K、跨分组与 ContextMenu focus restore。

记录 Safari/Edge Timeline 的 scripting、style/layout、paint，React profiling build 的 commit duration，以及 mounted row/fetch 次数。只有这样才能知道该删 sticky 代码、调 overscan，还是进一步拆轻 Row。

### 阶段 3：普通列表一次性 A/B

普通列表原型必须复用完全相同的 Row/GroupHeader 与数据分页，只替换 layout strategy；否则比较会被样式与业务差异污染。

若它在产品确认的最大常用 loaded count、最低支持 WebView 上同时满足：

- native fling 无明显掉帧或输入延迟；
- page append 不产生长阻塞；
- focus/键盘/ContextMenu 合同全部通过；
- 内存与 DOM 增长在长时使用后可接受；

则推荐 clean cut 到普通列表，并删除 TanStack virtualizer、手工 extent/offset、spacer、sticky bridge 和 offscreen focus bridge。若任一高量级场景不通过，则保留阶段 1/2 的单一虚拟实现，不引入运行时阈值。

## 最终推荐

1. **现在保留虚拟化，但重写分页 extent。** giant spacer 是当前最明确、最该删除的错误抽象。
2. **拒绝运行时阈值双轨。**它会让加载第二/第三页时切换 DOM 和 focus owner，正好违背“精简、少 if/else、长期维护”的目标。
3. **固定高度继续作为产品合同。**不要为未提出的多行/展开需求承担动态测量复杂度。
4. **Row/GroupHeader 统一，layout strategy 解耦。**Project/Lifecycle 可以继续普通流，TaskBoard 可以虚拟，但三者必须消费同一视觉 recipe 与交互 anatomy。
5. **用一次性 A/B 决定最终 clean cut。**真实证据若证明普通列表能覆盖产品上限，就彻底删除虚拟化；否则彻底删除普通 TaskBoard 原型，保留一个简化虚拟路径。

这条路线同时满足三件事：先解决用户已经感知到的错误滚动语义；避免把复杂度转移成两套 renderer；又给“最终是否完全不用虚拟列表”留下可验证、可 clean cut 的决策出口。
