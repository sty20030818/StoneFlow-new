# StoneFlow UI Lab 全量清单与 HeroUI 原生实现对齐

**Status:** implemented — pending manual review<br>
**日期:** 2026-08-30<br>
**锁定版本:** HeroUI OSS 3.2.4、HeroUI Styles 3.2.4、HeroUI Pro 1.0.0-beta.8<br>
**长期门禁:** [ADR-0003](../../Documents/01-架构/adr/ADR-0003-ui-lab-review-and-product-migration-gate.md)<br>
**现行样式合同:** [StoneFlow 视觉样式架构](../../src/styles/ARCHITECTURE.md)

## Problem Statement

StoneFlow 已完成 UI Lab 第一至八批人工审查和对应生产迁移，当前视觉结果已经确认，不再把本轮工作当作重新设计。剩余问题是可观察性与实现所有权：项目实际使用了哪些 HeroUI 组件、哪些 StoneFlow 组件只是上游组件的产品组合、哪些公共 recipe 仍有必要、哪些自实现可以在不改变视觉和业务合同的前提下回归 HeroUI 公共能力，目前缺少一处完整而可持续的答案。

现有 UI Lab 以人工审查样例为中心，能够验证已知问题，但不是生产组件总账。HeroUI 视图也只覆盖少量已采用组件和候选，无法替代卡顿的官网完成本地查阅。继续按遇到问题才补样例，会让新增生产组件、HeroUI 升级和 `components.css` 覆盖逐渐脱离审查面；反过来，把每个导出和每个调用点都渲染一遍，又会把 Lab 做成第二个组件官网和第二套设计系统。

本规格扩展同一个 UI Lab：建立完整可搜索清单，对真正需要判断的组件提供上游、StoneFlow Token、当前实现和产品组合对照，并把“视觉保持不变、实现尽量原生”变成可审查的迁移输入。Lab 只负责发现、比较和确认；生产重构仍在后续独立工作包中 hard cut。

## Goals

1. 列出所有进入 Main、Launcher 和生产共享/Feature 路径的 React UI 组件，并记录来源、消费者、组合关系和验证边界。
2. 列出锁定 HeroUI OSS/Pro 版本提供的组件家族，区分已使用、明确替换候选和当前无场景能力。
3. 对有判断价值的组件使用同一 fixture 比较 Upstream、Token、Current 和 Product Composition，而不是复制实现。
4. 冻结当前已确认视觉；只识别能用 HeroUI 公共 API、语义 token 或更小稳定 recipe 得到相同结果的实现简化机会。
5. 延续第一至八批完成记录，并以第九至十四批完成新增人工审查。
6. 增加最小静态门禁，防止生产新增 HeroUI 组件却未进入清单。

## Non-goals

- 本规格不修改生产视觉、组件实现、业务流程、领域模型、Tauri Command 或存储。
- 不升级 HeroUI、React Aria、Tailwind 或其他依赖；对照以项目锁定版本为准。
- 不渲染 HeroUI 的全部导出、全部 props 或状态笛卡尔积，不复制官网文档或源码。
- 不引入 Storybook、Chromatic、截图基线平台、运行时插件系统或新的生产依赖。
- 不建立第二套 token、Provider、组件库、一对一 wrapper、页面私有皮肤或永久双轨。
- 不用 Lab 浏览器结果代替 Main、Launcher、macOS/Windows WebView/Tauri 验收。

## 1. 清单范围与术语

### 1.1 两份清单，一个 Lab

Lab 提供两类可搜索清单，但共用同一 Shell、搜索、分类、详情和预览基础设施：

- **生产组件总账：** 所有从生产入口可达的具名 React UI 组件，以及生产实际导入的 HeroUI OSS/Pro 组件家族。
- **HeroUI 能力目录：** 锁定版本公开的组件家族，只记录名称、包、用途和采用状态；不等于每项都有交互预览。

“可搜索目录”只表示搜索结果能找到一条清单记录并查看来源、消费者、状态和理由。它不表示该组件已经渲染，也不表示迁移已获批准。

### 1.2 生产范围

纳入：

- `src/main.tsx`、`src/launcher.tsx` 可达的生产 React 树；
- `src/features`、`src/shared` 和桌面 Shell 中被生产路径使用的具名 UI 组件；
- `@heroui/react` 与 `@heroui-pro/react` 的生产导入家族；
- 重要产品组合场景及其公开产品组件。

排除：

- `src/ui-lab` 自身、测试 fixture、归档源码、纯调试页面和未进入生产树的实验代码；
- render callback、匿名片段和只为拆分 JSX 而存在、没有独立 UI 合同的局部表达式；
- 纯数据、Hook、Store、Command 和非 UI Adapter。

确有价值的 debug UI 可以单独标为 `debug`，但不计入生产覆盖率。依赖真实窗口、WebView、Portal 归属、Tauri 状态或跨窗口协议的条目登记为 `real-app-only`。

### 1.3 当前 HeroUI 生产导入快照

规格建立时，排除 Lab、测试和 debug 后，生产代码直接使用 42 个 HeroUI OSS 组件家族与 11 个 HeroUI Pro 组件家族：

- **HeroUI OSS：** Alert、AlertDialog、Avatar、Breadcrumbs、Button、Calendar、Card、Checkbox、Chip、ColorSwatchPicker、Description、Disclosure、Dropdown、FieldError、Form、Header、Input、Kbd、Label、ListBox、Modal、NumberField、Popover、ProgressBar、ProgressCircle、Radio、RadioGroup、ScrollShadow、SearchField、Select、Separator、Skeleton、Spinner、Surface、Switch、TextArea、TextField、Toast、ToggleButton、ToggleButtonGroup、Toolbar、Tooltip。
- **HeroUI Pro：** ActionBar、CellSelect、CellSwitch、Command、ContextMenu、EmptyState、ListView、Resizable、Sheet、Sidebar、Timeline。

`toast` 是函数 API，`Selection` 是类型，不作为组件家族计数，但应在消费关系中记录。以上只是 2026-08-30 的审计起点，真实生产 import 和 catalog 漂移门禁才是持续事实源，不把数量写成长期架构合同。

### 1.4 家族、用法与组合

- 同一 HeroUI 或 StoneFlow 组件家族只建一条主记录，列出全部生产消费者，不按调用次数复制。
- 同一组件存在可观察的视觉、行为或产品语义差异时，在主记录下增加用法预览，而不是创建假组件。
- 纯叶子组件必须进入总账；只有能独立暴露共享规则、替换判断或真实风险的条目才获得独立预览。
- 已在父级产品场景中充分覆盖的叶子标为 `covered-in-composition`，并链接到该场景。

## 2. 所有权与处置

每条清单记录至少说明当前 Owner 和推荐 Owner。Owner 只使用以下四类：

| 分类 | 含义 |
| --- | --- |
| `Upstream` | HeroUI OSS/Pro 已完整拥有结构、状态、键盘、Focus、Overlay、可访问性与动画，StoneFlow 无视觉覆盖 |
| `Token` | 上游结构不变，仅由 `theme.css` 的全局语义值形成 StoneFlow 结果 |
| `Recipe` | 上游公共能力不足，`components.css` 保存多个真实消费者共享的最小稳定差异 |
| `Product` | StoneFlow 拥有产品结构、业务状态、组合或必要动态几何；HeroUI 只提供原料 |

处置结论单独记录为 `Keep`、`Simplify`、`Candidate` 或 `Real-app-only`。`Simplify` 不是第五个 Owner，也不是第二种生产实现；它必须指向真实消费者和可删除的代码、状态或选择器。没有当前收益的“以后也许能简化”不登记。

RowShell、TaskBoard、selection、Entity Detail host 等产品合同不得为了提高 HeroUI 使用率而强行改名或替换。它们应展示使用的上游原料、当前所有权以及“无一对一上游等价物”。

## 3. 对照模型

### 3.1 四层对照

对有独立预览价值的组件，按适用情况显示：

1. **Upstream：** 锁定版本 HeroUI 官方 CSS 与默认 Light 主题，不加载 StoneFlow token 或 recipe。
2. **Token：** 官方 CSS 加 `fonts.css` 与 `theme.css`，不加载 `components.css` 或 `base.css`，用于判断差异是否来自 StoneFlow 字体和全局语义值。
3. **Current：** 生产实际的 `styles/index.css` 结果，即当前已确认的 StoneFlow 视觉。
4. **Product Composition：** 使用生产公开组件和最小 fixture 展示真实组合；只在产品层有独立合同或风险时出现。

同一 fixture 数据、props 和适用状态必须复用。禁止为对照复制生产 JSX、改写上游组件或维护两份状态机。

若 Upstream 与 Current 在可观察结果上相同，只渲染一次并标记 `Upstream · 无覆盖`。只有真实差异才显示并排面板；没有 Token 差异时不为了凑齐四栏显示空对照。

`base.css` 的文档、选择、原生窗口和浏览器基础行为单独归入 Foundation，不悄悄计入 Token 或 Recipe 对照。Current 仍直接复用真实 `styles/index.css`，不得复制一份生产 CSS 链。

### 3.2 隔离边界

`src/ui-lab/main.tsx` 已加载完整 `styles/index.css`，而 `components.css` recipe 作用于根作用域，Overlay 还会 Portal。Upstream 与 Token 不能依靠同一 Document 中增加 class 或删除 class 得到可信结果。

因此使用一个仅开发环境可达的隔离 frame/renderer：

- Upstream 与 Token 在隔离 Document 中使用各自固定的 CSS 导入顺序和 Portal root；
- Current 与 Product Composition 继续使用现有 Lab renderer；
- 父 Lab 只传递 fixture 标识和必要的可序列化状态，不建立跨 frame 通用 RPC 平台；
- 隔离入口不得进入 Main、Launcher、Tauri 导航或生产构建；
- 隔离 renderer 是版本锁定的参考测量面，不是第二个生产 Theme 或 Provider。

若某组件无法在隔离 frame 中忠实复现，清单明确说明限制，并在 Current、产品场景或 `real-app-only` 中验证，不伪造“原生结果”。

### 3.3 视觉冻结规则

Current 是本轮目标，不因 Upstream 不同而自动改变。实现对齐只有在以下条件同时成立时才进入后续迁移候选：

- 用户可观察的尺寸、间距、圆角、颜色、排版、图标和适用交互状态保持感知稳定；
- 产品公共合同、业务状态、键盘路径和可访问性不退化；
- 能通过 HeroUI 公共 props/slots、语义 token 或稳定公共 recipe 表达；
- 能实质删除私有 DOM 依赖、重复状态机、手写 Focus/动画或冗余 CSS。

不要求 DOM、className 或亚像素完全相同。若当前结果依赖上游私有 DOM、重复状态机或手写交互，Lab 可以暂时同时展示 Current 与 Native Candidate 供用户选择；选择完成后，生产最终仍只保留一条实现路径。只有存在两个真实、语义不同的生产消费者时，才能长期保留两个变体。

## 4. 清单记录与覆盖状态

`src/ui-lab/uiLabCatalog.tsx` 继续是运行时目录和批次状态的唯一真相。实现可以按批次或来源拆文件，但必须汇总为一个目录，不建立可独立编辑的第二份 registry。

Catalog 同时支持 ledger-only 记录和 review unit：前者可搜索但不挂载预览，后者才进入人工批次。批次完整性只要求每个 review unit 恰好属于一个批次，不再强迫所有 ledger-only 条目进入批次。

每条记录至少包含：

- 稳定 id、名称、家族、来源包与锁定版本；
- 当前 Owner、推荐 Owner 与处置结论；
- 生产定义路径与全部消费位置；
- 组合父项和上游原料；
- 适用状态与验证边界；
- 采用状态：已使用、替换候选或当前无场景；
- 展示状态及理由：独立预览、组合覆盖、Upstream 无覆盖、`real-app-only`、候选预览或无预览。

已有 `coverage` 与人工 `reviewStatus` 继续分离。第一至八批保持完成记录；目录扩展不得把历史完成项重置为待审。具体 TypeScript 字段和文件拆分由实施时选择最小表达，不把规格字段机械翻译成新的类型层。

## 5. 状态与 fixture

每个预览只覆盖语义上适用的状态：

- default、hover、pressed、focus-visible、disabled；
- pending/loading、invalid；
- selected/current、open、mixed；
- 长中文、图标、窄宽度和密度，仅在组件确实受其影响时加入。

优先直接渲染生产公开组件并使用轻量 fixture。若需要深导入私有实现、复制生产 JSX，或伪造大量 Router、Query、Store、Tauri 状态，则使用能证明同一公共合同的最小场景；仍不可信时标为 `real-app-only`。Lab fixture 不写真实业务状态。

## 6. HeroUI 能力与替换候选

锁定版本的 HeroUI OSS/Pro 公开组件家族全部进入能力目录，但只有以下项目挂载交互预览：

- 生产已经使用的组件；
- 有明确 StoneFlow 替换对象和真实消费者的候选；
- 为解释产品组合所有权所需的上游原料。

初始替换候选为：

| HeroUI 候选 | 当前目标 | 核心判断 |
| --- | --- | --- |
| HoverCard | Task Preview | 是否保持延迟、焦点、内容与 Overlay 合同并删除自建行为 |
| InlineSelect | Metadata 属性编辑 | 是否保持 28px/Ghost 视觉与提交语义并减少状态和浮层代码 |
| Autocomplete / ComboBox | 可搜索属性菜单 | 是否保持筛选、多选/单选、关闭和焦点恢复合同 |
| TagGroup | Labels | 是否保持现有 28px 标签、分组选择和 Dropdown 定位合同 |
| Segment | 简单单选视图切换 | 是否真实匹配 Tabs/Toggle 的语义，而不只因为外观相似 |

候选只有在视觉不变、合同不退化且实现有实质删减时才推荐迁移。没有真实目标的 HeroUI 组件只提供目录信息，不为完整度创建 Demo 或引入 peer dependency。

## 7. 产品组合场景

以下场景必须进入总账；能在 Lab 中可信复现的部分提供独立预览，桌面专属部分继续标为 `real-app-only`：

1. Shell + Sidebar + Breadcrumb + PageFrame；
2. TaskBoard + Group Header + Task Row + bulk ActionBar；
3. Task Detail + Metadata + Timeline；
4. Global Search；
5. Settings + sync config；
6. Entity Detail Resizable / Sheet；
7. Launcher；
8. Update + Danger Confirm + Toast / recovery；
9. Space Editor + ColorSwatchPicker。

场景只包含揭示层级、状态、Owner 和替换判断所需的最小数据，不复制完整页面、路由或 Store。

## 8. 人工审查批次

第一至八批保持 `done`。新增批次每批约 8～10 个审查单元；最终成员由完整清单生成，但不得省略以下范围：

| 批次 | 范围 | 必含审查单元 |
| --- | --- | --- |
| 第九批 | HeroUI OSS 原子与表单 | Actions；Input/Textarea/SearchField；NumberField；选择控件；Select/ListBox；ComboBox/Autocomplete；日期与 Calendar；紧凑元数据 |
| 第十批 | HeroUI OSS/Pro 复杂控件 | Menu/Dropdown/Popover；Modal/AlertDialog/Sheet；Tabs/Disclosure；ListView/Table；Command；ActionBar；CellSwitch/CellSelect/InlineSelect；Resizable/ScrollShadow/Surface；Timeline/HoverCard/EmptyState |
| 第十一批 | StoneFlow 共享产品组件 | PageFrame；ActionTooltip；AppBreadcrumb；ShellSidebar/SidebarNavRow；RowShell；AppScrollArea；SettingsToggleRow；GlobalSearchResults；Task Detail 公共组件；Space Editor 组件 |
| 第十二批 | Task 与集合组合 | TaskBoard；Group Header；Task Row；连续选择；bulk ActionBar；Labels；Global Search 结果；Task Metadata；Activity/Timeline |
| 第十三批 | Shell、Settings、Launcher 与反馈场景 | Shell 组合；Task Detail；Settings/sync；Entity Detail；Launcher；Update；Danger Confirm；Toast/recovery；Space Editor |
| 第十四批 | 替换候选与样式架构收口 | 五个初始替换候选；Upstream 无覆盖项；Recipe 所有权；可删除选择器；完整清单覆盖；`real-app-only` 交接 |

同一条目已经在第一至八批完成人工确认且 Current 未发生变化时，只登记历史结论，不要求用户重复审查。新增对照暴露真实差异、Owner 冲突或候选决策时，才进入第九至十四批待审。

## 9. 样式架构约束

- `theme.css` 继续是全局语义值唯一 Owner。
- `components.css` 继续是 HeroUI OSS/Pro 最小跨应用公共差异唯一 Owner。
- 产品 Module 继续拥有产品结构、业务状态和必要动态几何。
- 本轮不按组件拆分 `components.css`；先通过删除冗余覆盖、按 Owner 排序和缩小选择器完成简化。只有出现可独立变化、独立消费和独立验证的真实轴时，才另行评估拆分。
- 不新增 TypeScript token 镜像、视觉 wrapper、私有 DOM skin、兼容 alias、feature flag 或并行 Provider。
- Lab 的隔离 baseline 只拥有参考环境装配，不拥有任何生产视觉值。

## 10. 实施顺序

1. 审计生产入口与 HeroUI 锁定版本，生成初始完整清单和消费位置。
2. 扩展单一 catalog、搜索和详情，使无预览条目也可被发现和解释。
3. 建立 dev-only Upstream/Token 隔离 renderer，并复用现有 fixture。
4. 按第九至十四批补最小预览和产品场景，由用户逐批审查。
5. 汇总 `Simplify` 与候选决策；一致项保持不动。
6. Lab 审查结束后另建生产迁移规格和 tickets，在正确 Owner 处 hard cut，并删除旧路径。

Lab 审查阶段不得顺手修改生产皮肤。只有影响 Lab 自身真实性的 bug 可以在本工作包内修复；发现生产差异只记录到 catalog 与本规格，不提前迁移。

已归档生产迁移规格中的“不扩建第九批”只约束当时已完成的工作包。本规格由后续新增的完整清单与 native-alignment 需求独立授权，不回写、不解冻旧规格。

## 11. Testing Decisions

### 自动化与静态门禁

- 新增最小静态检查：生产源码每个 `@heroui/react` / `@heroui-pro/react` 组件家族必须存在 catalog 记录；记录可标为独立预览、组合覆盖、Upstream 无覆盖、候选、`real-app-only` 或无预览并写明理由。
- Catalog 测试校验稳定 id、review unit 批次引用、来源、消费位置、覆盖理由和单一预览挂载；ledger-only 条目不要求批次，不测试 HeroUI 私有 DOM 或 className。
- 隔离 renderer 测试只证明入口隔离、固定样式层、fixture 选择和 Portal 清理；不把 jsdom 或 class 快照当作视觉证据。
- 生产构建必须继续排除 UI Lab 及隔离 baseline 入口，生产源码不得反向导入 Lab。
- 每个实施 ticket 运行最小相关测试；工作包收口运行根级 `bun typecheck`、`bun lint`、`bun run lint:boundaries`、`bun format:check` 和生产构建。

不为“自动发现所有自定义 React 组件”建设新的 AST 平台。初始全量审计覆盖具名生产组件；长期自动门禁先守住最稳定、最容易漂移的 HeroUI import 边界。

### 人工与真实应用证据

- 浏览器 Lab 人工确认视觉对照、适用状态、Owner 和候选取舍。
- 执行时复用用户已经打开的 UI Lab 服务与 Chrome；未经明确要求，不主动启动长期开发服务或另开浏览器窗口。
- 100%/125% 缩放、窗口断点、Portal 归属、真实 Shell 焦点恢复、macOS WKWebView、Windows WebView2 和跨窗口状态继续由[统一产品验收](../unified-product-acceptance/spec.md)负责。
- Lab、自动化和真实应用证据分别记录，任何一类不得代签另外两类。

## 12. Acceptance Criteria

1. 生产组件总账覆盖全部纳入范围的具名 React UI 组件，并列出 HeroUI 家族、定义路径、消费位置和组合父项。
2. 锁定版本 HeroUI OSS/Pro 组件家族可搜索，并明确已使用、候选或当前无场景。
3. 所有生产 HeroUI import 均通过 catalog 漂移门禁；无独立预览的条目有可审查理由。
4. 有真实差异的组件可以使用同一 fixture 查看适用的 Upstream、Token、Current 和 Product Composition；相同项只渲染一次。
5. 隔离 baseline 不进入生产构建，不成为第二个生产主题、Provider 或组件系统。
6. Current 视觉与第一至八批已确认结果保持不变；本工作包没有生产样式迁移。
7. 第九至十四批可从 catalog 派生清单与进度，第一至八批历史完成状态保持不变。
8. 每个 `Simplify` 或替换候选都指向真实消费者、预期删除项、保留合同和验证边界。
9. 产品代码不依赖 UI Lab，没有新增生产依赖、兼容层、视觉 wrapper 或平行 token。
10. 浏览器、自动化和真实 Tauri/WebView 验收边界清晰，未执行项不标记为通过。

## 13. Exit Criteria

第九至十四批全部完成后，本工作包只输出三类结果：保持现状、可在相同视觉下简化实现、需要用户在 Current 与 Native Candidate 中选择。随后创建新的生产迁移规格和本地 tickets；所有真实消费者可同步修改时使用 hard cut，迁移后删除旧 recipe、自实现和临时对照，不保留永久双轨。

## 14. Implementation Tickets

| Ticket | 交付 | 依赖 |
| --- | --- | --- |
| [01](./issues/01-ledger-capable-catalog-kernel.md) | Catalog 支持总账与 review unit | 无 |
| [02](./issues/02-production-and-heroui-inventory.md) | 完整生产/HeroUI 清单与漂移门禁 | 01 |
| [03](./issues/03-isolated-native-comparison-renderer.md) | dev-only Upstream/Token/Current 隔离对照 | 02 |
| [04](./issues/04-batch-09-heroui-oss-atoms-forms.md) | 第九批 OSS 原子与表单 | 03 |
| [05](./issues/05-batch-10-heroui-complex-controls.md) | 第十批 OSS/Pro 复杂控件 | 03 |
| [06](./issues/06-batch-11-stoneflow-shared-components.md) | 第十一批 StoneFlow 共享组件 | 03 |
| [07](./issues/07-batch-12-task-collection-compositions.md) | 第十二批 Task 与集合组合 | 04、05、06 |
| [08](./issues/08-batch-13-shell-settings-desktop-scenes.md) | 第十三批桌面产品场景 | 07 |
| [09](./issues/09-batch-14-candidates-style-architecture-closure.md) | 第十四批候选与样式架构审查 | 04～08 |
| [10](./issues/10-coverage-release-acceptance-handoff.md) | 覆盖、发布边界与验收交接 | 09 |

Tickets 01～03 串行维护 catalog 事实源；03 完成后，04～06 可以分别拥有独立 sample 模块并行实施。07～10 按组合依赖顺序收口。

## 关联文档

- [已归档 UI Lab 建设规格](../archive/ui-system-lab/spec.md)
- [已归档 UI Lab 人工审查规格](../archive/ui-lab-review/spec.md)
- [已归档 UI Lab 生产迁移规格](../archive/ui-system-production-migration/spec.md)
- [HeroUI UI 平台决策](../../Documents/01-架构/adr/ADR-0002-heroui-ui-platform.md)
- [UI Lab 门禁决策](../../Documents/01-架构/adr/ADR-0003-ui-lab-review-and-product-migration-gate.md)
