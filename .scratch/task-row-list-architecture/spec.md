# StoneFlow Row 与集合列表单轨架构改造

**Status:** ready-for-agent
**Triage:** ready-for-agent
**日期:** 2026-09-02
**研究输入:** [StoneFlow 长列表与虚拟化长期选型研究](./virtual-list-research.md)

## Problem Statement

StoneFlow 的所有任务、独立事项、项目详情与 Saved View 详情已经共用 Task Workspace 和 TaskBoard，因此 Task Row、连续选择和 Group Header 基本符合已确认的 UI 设计。项目总览与生命周期页面虽然也使用 RowShell、HeroUI collection 和相同的选择语义，却分别维护自己的 ProjectBoard、LifecycleBoard、Group Header 与 Row 内部排版，所以出现了 34px/36px 高度、背景、圆角、字体、间距、选择连续形状和页面滚动 inset 的漂移。

当前共享只停在 RowShell 的外层状态壳。Task、Project、Lifecycle 三个 Adapter 仍各自重复 selection reveal、leading icon、title truncation、properties、trailing actions、事件阻断和响应式隐藏结构。结果是同一种 Row 规则需要在多个 Feature 同步修改，ProjectBoard 与 LifecycleBoard 还重复维护 section selection、collapse、Context Menu 和 row mapping。继续按页面修 class 会保留错误所有权；把所有实体塞进一个通用 EntityRow、列配置 DSL 或 boolean-prop 组件，则会把领域差异变成更难维护的条件分支。

TaskBoard 还存在独立的滚动语义和性能问题。后端使用约 150 条一页的 cursor pagination，前端却把 `totalCount - loadedCount` 伪装成一个可滚动的巨大 spacer。10,000 条结果在首屏后会产生约 45 万像素的空高度，滚动条承诺了后端并不支持随机访问的位置。快速 fling 或拖动 scrollbar thumb 时，用户可能直接进入未加载空白区。与此同时，虚拟热路径仍包含不稳定的 key callback、被新对象引用击穿的 memo、每行线性 ordinal 查找、死 ref 和全量 fallback；现有 performance harness 又没有真实追加分页、使用错误的 long-task 门槛，也不能代表 WKWebView/WebView2 的原生滚动。

这项工作需要形成一个长期单轨：所有集合页共享同一 Row、Header 与 scroll-body 契约；TaskBoard 先修正 cursor pagination 与虚拟化协议，再以真实 WebView 证据决定最终保留虚拟列表还是普通列表。不能长期保留阈值切换、feature flag、兼容 alias、两套 renderer 或无退出条件的 benchmark 旁路。

## Solution

使用一个本地工作包承载共同架构，实施时拆成三个严格顺序的任务。三个任务不是互相独立的规格：后一个任务消费前一个任务已经稳定的 Row/Board 契约，从而避免在同一次性能比较里同时改变视觉结构、分页语义和 layout engine。

| 顺序 | 实施任务 | 主要结果 | 依赖与退出条件 |
| --- | --- | --- | --- |
| 01 | 统一 Row、Section Header 与集合滚动契约 | 三类实体使用同一 RowShell + RowLayout + BoardRowSlot + BoardSectionHeader；集合页使用同一 CollectionBody；Project/Lifecycle 只共享窄 Section 壳 | 无前置；全部生产消费者、UI Lab 和测试同步迁移，旧形状同批删除 |
| 02 | 修正 TaskBoard 虚拟化与 React 热路径 | 只虚拟已加载真实项，尾部使用小型 loader sentinel；稳定热路径身份、分页、焦点和 ARIA；删除假高度与死代码 | 依赖 01 的固定几何和真实 Row；聚焦自动化与优化后虚拟基线通过 |
| 03 | 真实 WebView A/B 与单引擎 hard cut | 使用相同 Row/Header/Data 比较优化后虚拟列表和一次性普通列表候选；只保留胜出引擎并删除候选、旧依赖与临时 harness | 依赖 02；macOS WKWebView 与 Windows WebView2 证据齐全，最终仓库只有一条生产路径 |

### 任务 01：统一 Row、Section Header 与集合滚动契约

- RowShell 继续是唯一交互根：拥有固定 Row 高度、outer padding、active/selected/hover/focus/pending 状态 hook 和可访问根节点，不理解 Task、Project 或 Lifecycle。
- 新增无状态 RowLayout，以五个当前真实的 ReactNode 槽位组合内容：`selection`、`leading`、`primary`、`properties`、`actions`。它只拥有内部对齐、间距、收缩、截断、metadata/action reveal 与响应式优先级；不接收 entity kind、列配置、render callback、状态机或业务动作。
- TaskRowAdapter、ProjectRowAdapter、LifecycleRowAdapter 保持显式领域组件。每个 Adapter 决定使用哪些槽位、渲染哪些 HeroUI 控件、如何建立 Command Context 和执行领域动作；缺少的属性直接不提供对应槽位，不通过 `isTask`、`showX` 组合出万能 Row。
- 新增 BoardRowSlot，消费共享的 44px Row 几何并拥有 2px item gap；Board/Section 根据同一组内的相邻 selected keys 计算 `single/first/middle/last`。它是连续选择几何的唯一 Owner，RowShell 仍只拥有自身高度与交互皮肤。迁移时删除 RowShell 的 selection-group-position API、TaskBoard 私有 rounding class 和对应重复 CSS，避免两层同时持有同一形状事实。
- 新增 BoardSectionHeader，只提供 36px 高度、低噪声 surface、圆角、间距、label/count/selected-count 和显式 leading/trailing children。sticky/absolute positioning、collapse、double-click、Context Menu、创建动作和焦点恢复继续由各 Board 的 layout/collection 层拥有。
- Row 高 44px、Header 高 36px、item gap 2px 进入同一个共享产品几何事实源。RowShell、BoardRowSlot、Section Header、TaskBoard estimate/offset/sticky 推导都消费这一事实源，不再同时保留 Tailwind class 数值和虚拟模型数值两份知识；不增加 density、size 或动态高度 variant。
- PageFrame 的 `VirtualizedBody` clean cut 为 `CollectionBody`，统一 Task Workspace、Project Overview、Archive 与 Trash 的唯一 scroll viewport、horizontal inset、top/bottom inset 和 overflow 合同。普通内容页继续使用 `Body`；不保留旧名称 alias。
- ProjectBoard 与 LifecycleBoard 不合并成通用 Board。只提取它们当前确实相同的非虚拟 GroupedBoardSection 壳：section wrapper、selection count、select/deselect-all、collapse/expand、Context Menu 和 BoardRowSlot mapping。两边继续拥有领域 section model、icon、文案、状态、row Adapter 与动作。
- 三类 Board 的 loading、empty、error 状态保持 HeroUI 原生组件，并统一为可恢复合同。error 必须提供真实 refetch/retry 动作，不能只显示“请稍后重试”；不为这三段相似 JSX 额外建立状态 DSL。
- UI Lab 现有 Task/Group Header/Row/连续选择样例改为消费生产公开组件，不新建批次、不复制 fixture 视觉实现，也不把 Lab 结果当作真实 Tauri 验收。

任务 01 的退出条件是：三类真实 Board 在默认/紧凑宽度、hover、keyboard focus、selected、selected-hover、连续选择、折叠与 Context Menu 状态下使用同一可观察视觉契约；旧 `VirtualizedBody`、RowShell selection-position、TaskBoard 私有 header/rounding recipe 和重复 UI Lab shape 均无消费者。

### 任务 02：修正 TaskBoard 虚拟化与 React 热路径

- 删除未加载任务的巨大 spacer。虚拟 scroll extent 只由已加载的真实 header/row 加一个固定小型 loader sentinel 构成；`totalCount` 只用于用户文案与加载进度，不再制造随机可达高度。
- loader sentinel 明确区分 idle、loading、error 与 exhausted；进入临界区只允许一个 in-flight fetch。追加一页后保持稳定 scroll position，失败时提供原位 retry，不自动连续追取几十页。
- 删除只为假 spacer 穿透的 `loadedCount`、extent 参数、ref 和 wiring；若某个参数仍有真实语义，必须由当前消费者证明后改名留存，不能作为兼容壳继续存在。
- 将 virtualizer 的 key getter、size estimator、range extractor 和 scroll-element getter 稳定在真实依赖上，避免 range render 时因函数 identity 改变而重建 measurement cache。固定高度路径继续不使用动态测量。
- 在 TaskBoardGridRow 建立有效的 memo 边界，并让 row actions、project binding、Context Menu bulk actions、row state 与 React Aria props 在语义未变时保持稳定引用。先修上游 identity，再删除不再有价值的深 comparator 分支；不在全树无差别添加 `useMemo`。
- 每次 projection 构建 key-to-ordinal Map，替代 mounted Row 上重复 `indexOf`。删除未使用 measure ref、显式 `measureElement: undefined`、virtualItems 为空时渲染全部 flatItems 的兼容 fallback，以及消费者归零的半条 scroll bridge。
- 保留详情关闭后的 stable-id focus restore 产品合同；无论最终引擎如何，都不能把“virtual-only scrollToIndex 实现”与“用户返回原 Row 的行为”一起删除。
- overscan 暂时保持当前值 6；sticky overlay 与单实例 sticky、virtual row 的 `content-visibility` 开关只进入任务 03 的同条件测量，不凭静态偏好先重写。
- React Aria/React Stately 继续是 selection/focus 的唯一 collection state。分页尚未结束时，grid 使用 `aria-rowcount=-1`，并通过可访问 status 文案报告“已加载/总数”；全部加载后再报告当前 navigable row count。Row index 来自当前稳定可导航顺序，不把包含折叠/未加载项的服务端 count 与本地 ordinal 拼成不一致的 grid。

任务 02 的退出条件是：快速滚到底不再进入巨大空白；分页只触发一次且可重试；折叠、range selection、J/K/Arrow、Context Menu 关闭、详情关闭与离屏 stable-id focus 均保持；自动化能证明 scroll extent 不再由未加载总数决定，并建立优化后虚拟路径基线。

### 任务 03：真实 WebView A/B 与单引擎 hard cut

- 先修复现有 performance harness：long-task 门槛改为平台标准的 50ms；paged fixture 真实追加并结束请求；Row 使用与生产相同的 Context Menu、metadata 与 selection 成本；测试覆盖 150、300、600、2,000 和 10,000 个已加载富 Row，而不是 200 个 Row 加 10,000 假总数。
- 先测任务 02 的优化后虚拟实现，再建立一次性 ordinary-list candidate。候选必须复用完全相同的 RowShell、RowLayout、BoardRowSlot、BoardSectionHeader、CollectionBody、collection state、cursor pages 和业务 actions，只替换 layout strategy。
- A/B 在 production build、相同设备、相同数据与 viewport 下覆盖 native trackpad fling、反向 fling、scrollbar thumb drag、连续 J/K/Arrow、range selection、折叠/展开、Context Menu 焦点恢复、详情返回焦点、分页追加、错误重试、长时内存与 DOM 增长。
- macOS WKWebView 与 Windows WebView2 分开记录 scripting、style/layout、paint、50ms long tasks、React commit、mounted Row、fetch 次数和人工跟手感；Chrome/Vite、jsdom 或单一平台不能替代这项证据。
- ordinary candidate 只有在产品可达的 10,000 个富 Row、两类最低支持 WebView、键盘/焦点/分页矩阵均不劣于优化后虚拟路径，且内存与 DOM 增长可接受时才胜出。否则保留优化后虚拟路径。
- ordinary 胜出时，clean cut 删除 TanStack virtualizer、手工 extent/offset、virtual-only range/sticky/focus bridge 以及零消费者依赖；virtual 胜出时，删除 ordinary candidate 与其分支。两种结果都不保留 threshold hybrid、feature flag、兼容 alias 或运行时 renderer 切换。
- 决策完成后删除 benchmark-only access、route、page/export、fixtures、报告 glue 和临时实验开关；结果与平台边界写回本工作包，长期架构文档只描述最终单轨。

任务 03 的退出条件是：真实平台证据可复核，最终生产包只有一个 layout engine，失败候选与临时测量面已删除，依赖与 lockfile 无孤儿，A2、A3、ADR-0002 和相关模块架构文档已同步最终事实。

### 总完成判据

- 所有 Task、Project、Lifecycle 生产 Row 与 Group Header 共享同一结构/几何 Owner，但领域属性、Command 与写动作仍由各自 Feature 持有。
- 项目总览、归档、回收站与 Task Workspace 的 Row/Header/scroll inset 在相同状态下不再视觉漂移。
- cursor pagination 不再伪造未加载随机访问；错误、加载、分页与结束状态均可理解且可恢复。
- 最终只保留一个 TaskBoard layout engine；所有旧 API、CSS shape、fallback、feature flag、测试替身、依赖和文档旧表述都有 zero-consumer 证据后删除。
- 自动化、浏览器 UI Lab、真实 Tauri WebView 与人工体验证据分别报告，不互相冒充。

## User Stories

1. 作为任务用户，我希望所有任务、独立事项、项目详情和 Saved View 中的任务行保持同一排版，从而可以稳定扫读而不重新适应页面。
2. 作为项目用户，我希望项目总览的 Project Row 与任务页共享同一行高、留白、选择和焦点语言，从而不会像另一套产品。
3. 作为生命周期用户，我希望归档与回收站的 Row 和 Group Header 与其它集合页一致，从而清楚理解相同状态和操作。
4. 作为用户，我希望 Checkbox、实体图标、主标题、属性和尾部动作始终出现在可预测槽位，从而快速定位目标。
5. 作为用户，我希望 Task 只显示 Task 属性、Project 只显示 Project 属性，避免为了统一外壳出现无意义空列或占位。
6. 作为用户，我希望长标题优先保留可读空间并正确截断，低优先级 metadata 不挤压主内容。
7. 作为鼠标用户，我希望 Row hover 时 Checkbox 与上下文动作以相同方式出现，不同页面不会突然改变布局。
8. 作为键盘用户，我希望 focus-visible、J/K、Arrow、Enter、Space 和 Escape 在三类集合中保持现有语义。
9. 作为多选用户，我希望同一 section 内相邻 selected rows 形成连续视觉组，同时不跨 Group Header 错误连接。
10. 作为多选用户，我希望 selected、selected-hover、active 和 keyboard focus 是可区分状态，而不是同一层颜色或边框。
11. 作为右键菜单用户，我希望 Context Menu 关闭后焦点回到原 Row，并且批量目标仍以 selection 为准。
12. 作为详情用户，我希望关闭 Task Detail 后回到先前 Task Row，即使该 Row 曾经在视口外。
13. 作为快速滚动用户，我希望滚动条只表示已经加载且真实可到达的内容，不会把我送进几十万像素的空白。
14. 作为触控板用户，我希望快速 fling 与反向 fling 跟手，不因不稳定 Row 重渲染出现明显顿挫。
15. 作为 scrollbar 用户，我希望拖动 thumb 时不会落到后端尚不能访问的位置，也不会连续追取大量页面。
16. 作为分页用户，我希望接近末尾时只发起一次加载，并在追加后保持当前位置稳定。
17. 作为网络失败用户，我希望在 Board 内看到明确错误与真实重试入口，而不是只能“稍后重试”。
18. 作为折叠分组用户，我希望折叠后 scroll extent、selection 和 keyboard re-entry 立即反映可见结构。
19. 作为使用 Group Header 的用户，我希望标题、数量、已选数量、折叠按钮和尾部动作在所有 Board 上采用相同 anatomy。
20. 作为窄窗口用户，我希望 560px 紧凑排版继续只有一个明确档位，标题与关键动作优先，属性按既定优先级隐藏。
21. 作为读屏用户，我希望 Row、Group Header、Checkbox 与动作具有准确 accessible name，并能区分 expanded、selected、loading 和 error。
22. 作为读屏用户，我希望分页期间听到诚实的“已加载/总数”信息，不收到与当前 row index 相互矛盾的总行数。
23. 作为维护者，我希望修改 Row 间距、标题收缩或 action reveal 时只改一个共同 Owner。
24. 作为维护者，我希望增加或删除某个 Task/Project 属性时只修改对应 Adapter，而不触碰通用 Row 的实体判断分支。
25. 作为维护者，我希望 Row API 由五个真实槽位构成，不维护 boolean 组合、列 schema、config renderer 或单实现 factory。
26. 作为维护者，我希望 Project 与 Lifecycle 只共享确实同步变化的 Section mechanics，而不被迫进入通用 EntityBoard。
27. 作为维护者，我希望固定 Row/Header/gap 数值只存在一个事实源，视觉 CSS 与 virtual geometry 不会再次漂移。
28. 作为维护者，我希望 TaskBoard 的 totalCount 只表达查询事实，不再参与伪造 scroll geometry。
29. 作为维护者，我希望性能优化集中在已经确认的 hot path，不在全组件树堆叠无依据 memo 或 overscan 参数。
30. 作为维护者，我希望重构后没有旧 alias、兼容 fallback、双 renderer、死 ref 或孤儿依赖。
31. 作为 UI Lab 审查者，我希望样例直接渲染生产 Row/Header，而不是维护第二份静态视觉近似。
32. 作为测试维护者，我希望自动化验证可观察行为与稳定模型，不锁定私有调用顺序或整串 Tailwind class。
33. 作为性能验收者，我希望虚拟/普通列表使用相同数据和组件做同机比较，从而结果只反映 layout strategy 差异。
34. 作为桌面用户，我希望 macOS 与 Windows 分别验收，不用 Chrome 顺滑来代替真实 WKWebView/WebView2 结果。
35. 作为项目维护者，我希望 A2、A3、ADR 与模块架构只描述最终保留的单轨，不保存历史兼容措辞。

## Implementation Decisions

- 使用一个总规格和三个顺序实施任务，不做一次大爆炸 diff，也不拆成三个各自演化的架构规格。任务 01 是共同结构前置，任务 02 是 TaskBoard correctness/performance，任务 03 是证据门与最终 clean cut。
- RowShell、RowLayout、BoardRowSlot、BoardSectionHeader 各有单一变化原因：交互根、内部槽位排版、相邻 Row 几何、Section Header anatomy。任一组件不得读取领域实体或 layout-engine 状态。
- RowLayout 使用五个显式 ReactNode slots；不使用共享 Context、Provider、compound state、render-prop callback、CVA variant matrix 或列配置。只有当前三个生产 Adapter 是消费者。
- BoardRowSlot 由 Board/Section 提供邻接结果，并成为 selection group position 的唯一 Owner。RowShell 不再持有同一位置属性，TaskBoard 不再保留私有 rounding map。
- 固定几何属于共享产品 Module，不扩充为第二套 design token 系统。继续复用现有 semantic theme 与 HeroUI recipe，不新增颜色、圆角、density Provider 或一对一 wrapper。
- HeroUI 继续拥有 Checkbox、Button、Chip、Menu、Focus、Overlay、keyboard 和 accessibility 状态机；StoneFlow 的 Row/Board 只决定产品结构、状态投影与必要几何。
- GroupedBoardSection 只服务 Project/Lifecycle 两个已确认的非虚拟消费者；TaskBoard 保持专用 orchestrator。若提取后只是参数透传或要求调用方理解内部顺序，应回退为共享 Header + 各域本地 section，而不是保留薄层。
- PageFrame.CollectionBody 是全部集合页的唯一 scroll-body public interface；普通内容 PageFrame.Body 保持不变。旧 VirtualizedBody 在同批消费者迁移后删除，不保留 alias。
- 任务 01 采用 clean cut：三类 Board、UI Lab、performance surface、tests 和文档消费者同时迁移，任何旧 API/CSS 仅在搜索确认 zero consumer 后删除。
- 任务 02 继续使用当前 cursor API 和 fixed-height fast path，不改变后端 schema、分页协议或领域查询。未加载数据不会产生可滚动像素。
- 优先稳定 Virtualizer 与 Row 边界的 callback/object identity；只在有真实计算或渲染收益的位置保留 memo。React 状态、selection 与业务对象仍使用现有事实源。
- totalCount、loaded progress、scroll extent 与 ARIA collection size 是不同事实，分别建模；不得用一个数同时冒充四种语义。
- 不引入新的 virtualization library。React Aria Virtualizer、DataGrid 或 HeroUI Pro ListView 的整层替换不在本规格内，因为它们不能直接满足现有 grouped sticky、cursor、selection 和 focus 合同。
- 任务 03 的 ordinary list 只是 benchmark candidate，不进入长期生产开关。最终决定以相同组件、真实富 Row、两个 WebView 和可复核数据为准。
- 若 ordinary 胜出，删除无消费者的 `@tanstack/react-virtual` 声明与 lock 记录；若 virtual 胜出，依赖继续精确由现有工具链管理。两种结果都不增加依赖。
- benchmark surface 有明确退出条件：完成 A/B 并保存证据后删除运行时代码，只在本地工作包保留结论和必要原始结果。
- authoritative docs 在最终 engine 决定后同步；尤其修正当前关于服务端 spacer、总高度与 VirtualizedBody 的旧合同。不为普通实现细节新建平行 CONTEXT 或 design-system 文档。

## Testing Decisions

- 好测试验证用户可见行为、公共组件 contract、selection/focus/paging 语义和纯 geometry model；不以私有函数调用顺序、完整 JSX snapshot 或 Tailwind class 字符串作为主要契约。
- 最高自动化接缝沿用现有 TaskBoard、ProjectBoard、LifecycleBoard DOM tests，并使用真实 Row/Header 组件。分别覆盖 loading/empty/error+retry、section collapse/expand、select/deselect-all、Row activate、Context Menu 与 keyboard focus；不新增通用测试 DSL。
- RowShell/RowLayout/BoardRowSlot/BoardSectionHeader 的聚焦测试覆盖：五个槽位的顺序与收缩、可选槽位不产生空占位、同 section 的 single/first/middle/last、Header 的 accessible label/count/actions，以及唯一 CollectionBody viewport。
- taskBoardModel 的纯测试覆盖：fixed geometry、loaded-only extent、单一 sentinel、totalCount 不改变 scroll height、page append 保持 offset、折叠后 geometry 和 key-to-ordinal projection。
- TaskBoard 集成测试覆盖：sentinel 到达只 fetch 一次、loading 不重复 fetch、失败可 retry、exhausted 不再 fetch、离屏 stable-id focus、详情关闭恢复、J/K/Arrow、range selection 不跨 header、Context Menu 关闭恢复。
- 新增一个不 mock TaskBoardGridRow/TaskRowAdapter 的 render regression：对无关 parent/range 更新，语义未变的已挂载 Row 不应重新执行昂贵 Adapter；测试只保护已确认 hot path，不扩成全树 render-count 套件。
- UI Lab 继续用于真实生产组件的浏览器视觉检查：44/36/2 几何、hover/selected/focus、连续选择、长标题与 560px 容器。它不替代 Main、Launcher 或 Tauri WebView。
- performance harness 在任务 03 前是临时决策接缝，不是长期产品表面。必须先证明它能真实追加 pages、捕获 50ms long tasks、挂载重 Row 并区分 React 与 layout/paint，才可使用其结果。
- 真机验收分别覆盖 macOS WKWebView 和 Windows WebView2；至少记录 native fling、thumb drag、page append、keyboard/focus、Context Menu、内存/DOM 和人工跟手感。任一缺失都不能宣称最终列表体验完成。
- 自动化门禁使用仓库根脚本：聚焦测试后运行 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check`、`bun test:run`、`bun run test:scripts`、`bun run test:release` 与 `bun run build`。本规格不改 Rust；只有实际实现触及后端时才增加相关 Rust 检查。
- 每个阶段单独审查 diff 与旧符号搜索。失败测试先解释根因，不通过放宽断言、skip、任意 sleep 或重试掩盖问题。

## Out of Scope

- 不修改 Task、Project、Lifecycle 的领域模型、SQLite schema、Tauri command、同步协议或 cursor pagination API。
- 不把 Task、Project 和 Lifecycle 合并为一个领域实体，也不创建 EntityRow、EntityBoard、column schema、config DSL、factory 或 plugin system。
- 不增加 Row density、动态高度、多行标题、行内展开、用户自定义列布局或第二个 560px 以下密度档。
- 不重新设计已确认的 Current 视觉、HeroUI 控件状态、Accent、颜色、字体、圆角体系或第一方动画。
- 不用 HeroUI Pro ListView/DataGrid、React Aria Virtualizer 或另一项依赖直接替换 TaskBoard。
- 不保留 small-list/large-list threshold hybrid，不引入生产 feature flag，也不维护 virtual/ordinary 两套回归矩阵。
- 不通过硬分页上限解决 ordinary-list 性能；显式 pagination 会改变产品浏览行为，需要独立产品决定。
- 不把 `content-visibility` 当作删除 DOM/React 实例的等价方案；它只作为任务 03 的一个可删除测量变量。
- 不把浏览器 UI Lab、jsdom、合成 `scrollTop` 或单一 macOS profile 当作跨平台真实验收。
- 不处理本因果边界之外的全仓样式、页面组件拆分、依赖升级或历史技术债。
- 本规格发布不实施生产代码、不暂存、不提交、不推送，也不创建外部 Issue、PR 或云端资源。

## Further Notes

- 本轮 `$to-spec` 只发布这一个 `spec.md`。后续使用项目的 `to-tickets` 流程时，再生成三个顺序实施文件；现在不提前创建 `issues/`。
- 现有研究已经区分当前代码事实、官方资料、静态推断与真实 WebView 待验证项。实施代理应复用该研究，不重新从“要不要虚拟化”开始泛化调研。
- 当前 A2、A3 与 ADR-0002 仍把服务端 spacer/总高度和 VirtualizedBody 写成既定合同；它们是任务 02/03 必须更新的权威真源，不允许代码 hard cut 后留下旧描述。
- 任务 01 可以在同一改造分支内连续完成，但其结构迁移和任务 02 的性能行为修改应保持可审查边界，并分别保留验证证据。
- 真正的最终选型不是“虚拟化一定高级”或“普通 DOM 一定更原生”，而是哪一条单轨在 StoneFlow 的真实富 Row、cursor API、焦点合同和最低支持 WebView 上成立。
