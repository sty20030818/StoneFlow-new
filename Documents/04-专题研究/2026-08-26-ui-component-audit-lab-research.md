# StoneFlow 组件盘点与 HeroUI 本地实验室研究

> 日期：2026-08-26
>
> 研究问题：是否需要“StoneFlow 项目组件展示页”和“HeroUI 组件合集页”，以及是否存在维护成本更低的替代方案
>
> 资料范围：HeroUI OSS/Pro 官方文档与统一 MCP、HeroUI OSS 官方源码、Storybook/Vite/W3C 官方文档、StoneFlow 当前仓库
> 本文只做研究和方案建议，不实现页面、不创建 ADR、不修改产品代码。

## 一、结论先行

**有必要建立一个本地 UI 审查工作台，但没有必要维护两个彼此独立、追求“全量”的组件展厅。**

推荐方案是：

1. 在现有仓库建立**一个仅开发期可用的独立 Vite UI Lab**，内部提供两个视图：
   - **StoneFlow 状态矩阵**：展示真实公共组件、产品 recipe 和少量代表性组合场景，是发现当前 UI/UX 问题的主工具。
   - **HeroUI 候选库**：只展示当前正在使用或准备评估替换的 HeroUI OSS/Pro 组件，不复制完整官网。
2. StoneFlow 视图按“视觉审查单元”组织，不按 `.tsx` 文件机械罗列。Button、Breadcrumb、Sidebar Row 是审查单元；依赖路由、查询、Tauri IPC 和多层 Provider 的页面组件不是天然可独立展示的组件。
3. HeroUI 视图采用**按需补样例**：组件名称和 API 以官方统一 MCP 为实时来源，本地只保留确实需要肉眼比较的样例。官方 MCP 已同时提供 OSS/Pro 的组件清单、完整组件文档、BEM CSS、主题变量和 OSS 源码，没有必要在仓库里再维护第二份 API 文档。[HeroUI Pro MCP 官方文档](https://heroui.pro/docs/react/getting-started/mcp-server)
4. 发现问题不能只靠一张长页面。必须把 Hover、Pressed、Current/Selected、Pointer focus、Keyboard focus-visible、Disabled、Loading、Invalid、Open，以及窄宽度状态纳入固定巡视流程。
5. **现在不引入 Storybook。**它在“团队共享 stories、Controls、交互测试、无障碍检查或视觉回归”成为真实需求时很有价值；当前只为本地肉眼巡检引入整套运行时和 stories 维护合同，成本高于收益。[Storybook Browse Stories](https://storybook.js.org/docs/get-started/browse-stories)、[Storybook UI testing](https://storybook.js.org/docs/writing-tests)

一句话判断：**该做的是一个小型“UI 诊断台”，不是两个新组件库，也不是 HeroUI 官网的离线复刻。**

## 二、先澄清“所有组件”到底是什么

“组件清单”至少包含四种不同对象；如果不先分层，最后会得到一个很长但无法指导判断的文件列表。

| 层级 | StoneFlow 例子 | 适合在 Lab 中怎么呈现 |
| --- | --- | --- |
| 主题与基础规则 | Accent、Link、Focus、Control height、Radius、Typography | Token/规则样本；必须展示亮色、Accent 和键盘焦点 |
| 标准控件 | Button、Input、TextField、Dropdown、Modal | 展示真实 HeroUI 组件和关键变体/状态 |
| 产品公共 recipe | `AppBreadcrumb`、`RowShell`、`PageFrame`、Tooltip 组合 | 展示真实 StoneFlow 组件和产品语义状态 |
| 组合表面与流程 | Shell Sidebar、FilterBar、Task Row、Task Detail、Settings Form | 用小型 scene/fixture 呈现；必要时回到真实应用验收 |

当前静态盘点显示：

- `src/**/components/` 下有 **105 个非测试 `.tsx` 文件**；这只是路径统计，不等于 105 个可复用视觉组件。
- `src/shared/components/` 下只有 **10 个非测试 `.tsx` 文件**，更接近稳定公共组件集合。
- 有 **124 个非测试 TS/TSX 文件直接导入 HeroUI OSS/Pro**，说明视觉问题经常跨 Layout、Feature 和 Route 出现，不能只审查 `shared/components`。
- 当前没有 `.storybook/`、`*.stories.*` 或 React 版 HeroUI Lab；已有的 [`stoneflow_heroui_light_v1.html`](../99-素材/02-HTML原型/stoneflow_heroui_light_v1.html) 是 2056 行的手写 HTML/CSS 原型，不渲染真实 HeroUI React/React Aria 组件，不能验证 Modal、Dropdown、Focus management 或键盘行为。

因此，“项目组件展示页”的合理单位不是源文件，而是**会被人看到并能在多个状态下判断的视觉表面**。

## 三、用户列举的问题已经证明工作台有价值

这些现象并不是四个孤立 bug，而是四种不同的视觉 Owner。工作台最重要的能力是帮助判断问题应在哪一层修，而不是让人逐页猜 CSS。

### 1. 面包屑 Hover 下划线、当前项呈链接色

HeroUI OSS 当前官方 `breadcrumbs.css` 明确规定：

- `.breadcrumbs__link` 默认 `no-underline`；
- Hover / `data-hovered=true` 时应用 `underline`；
- `data-current=true` 时应用 `text-link`。

这是上游公开 recipe，不是浏览器随机样式。[HeroUI Breadcrumbs 官方 CSS](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/breadcrumbs.css)

StoneFlow 的 [`AppBreadcrumb.tsx`](../../src/shared/components/AppBreadcrumb.tsx) 复用了 `.breadcrumbs__link`，当前 [`components.css`](../../src/styles/components.css) 没有 Breadcrumbs 公共差异，因此肉眼看到的下划线和链接色符合上游合同。若以后决定改，Owner 应是集中 recipe，而不是每个页面分别补 `no-underline`。

### 2. 按钮“怎么都是蓝色的”

HeroUI Button 官方示例把未传 `variant` 的 `<Button>` 展示为 Primary；上游 `.button--primary` 又把背景绑定到 `--accent`。[HeroUI Button 文档](https://heroui.com/en/docs/react/components/button)、[HeroUI Button 官方 CSS](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/button.css)

StoneFlow 当前默认 Accent 是 cobalt，`--accent: #636cc0`；Primary Button 因而自然呈蓝紫色。[`theme.css`](../../src/styles/theme.css)

这类问题不能只问“颜色好不好看”，而应在 Lab 中同时检查：

- 当前动作是否真的属于 Primary CTA；
- 同一表面是否有过多默认 Primary；
- Secondary/Tertiary/Ghost 是否形成正确层级；
- 更换 Accent 后层级是否仍成立。

### 3. Sidebar 行高偏低

HeroUI Pro 上游 Sidebar menu item 使用 `min-h-9`；StoneFlow 的公共 recipe 将 `.sidebar__menu-item-content` 改为 `--control-height-md`，当前值是 `32px`。[HeroUI Pro Sidebar 文档](https://heroui.pro/docs/react/components/sidebar)、[`components.css`](../../src/styles/components.css)、[`theme.css`](../../src/styles/theme.css)

这说明需要比较的不是“Sidebar 组件存在不存在”，而是**上游默认几何、StoneFlow 控件高度、文字/图标尺寸和真实侧栏密度的组合结果**。

### 4. 输入框点按后的“框”

HeroUI Input 的 Focus 状态由公开的 `--field-border-focus`、`--field-focus` 和 `status-focused-field` 控制；StoneFlow 又有一套针对 pointer focus 与 keyboard focus-visible 的集中覆盖。[HeroUI Input 官方 CSS](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/input.css)、[`components.css`](../../src/styles/components.css)

这里不能把所有 Focus 视觉直接删掉。WCAG 2.2 要求键盘操作存在可见焦点；`:focus-visible` 正是区分键盘焦点和普通指针点击的标准方式。[W3C Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)、[W3C `:focus-visible` 技术](https://www.w3.org/WAI/WCAG22/Techniques/css/C45)

Lab 应把以下状态分开呈现和记录：

- 鼠标点击后仅有文本光标；
- `Tab` 导航后的 keyboard focus-visible；
- Focus + Invalid；
- Focus + Disabled/Read-only；
- 强制颜色模式。

## 四、HeroUI 当前范围与定制能力

### 1. 2026-08-26 官方组件快照

本次先调用 HeroUI Pro 官方统一 MCP 的 `list_components`，再核对代表性组件文档与 CSS。当前返回：

- **HeroUI OSS：71 个文档化顶层组件**，覆盖 Buttons、Collections、Colors、Controls、Data Display、Date and Time、Feedback、Forms、Layout、Media、Navigation、Overlays、Pickers、Typography、Utilities。[OSS 组件目录](https://heroui.com/en/docs/react/components)
- **HeroUI Pro：65 个文档化顶层组件**，共八类：

| Pro 分类 | 数量 | 代表组件 |
| --- | ---: | --- |
| Charts | 8 | AreaChart、BarChart、PieChart、RadarChart |
| Data Display | 17 | DataGrid、ListView、Timeline、Kanban、Map |
| AI | 14 | ChatMessage、PromptInput、Markdown、CodeBlock |
| Feedback | 5 | Rating、TrendChip、PressableFeedback |
| Layout | 1 | Resizable |
| Forms | 11 | CellSelect、CellSwitch、DropZone、RichTextEditor |
| Navigation | 7 | Sidebar、Command、ContextMenu、Stepper |
| Overlays | 2 | Sheet、EmojiPicker |

合计 **136 个文档化顶层组件**。[Pro 组件目录](https://heroui.pro/docs/react/components)、[HeroUI Pro MCP 官方文档](https://heroui.pro/docs/react/getting-started/mcp-server)

注意：StoneFlow 当前安装包的版本是 `@heroui/react@3.2.4`、`@heroui/styles@3.2.4`、`@heroui-pro/react@1.0.0-beta.8`。[`package.json`](../../package.json)

本地 OSS 包暴露了 85 个组件 subpath，高于“71 个文档化顶层组件”，原因是 MenuItem、Header、ColorInputGroup 等内部/组合构件也有独立出口。**export path 数量不能直接当作应该展示的组件数量。**Pro 当前 65 个组件 subpath 与官方清单数量一致。[本地 OSS package manifest](../../node_modules/@heroui/react/package.json)、[本地 Pro package manifest](../../node_modules/@heroui-pro/react/package.json)

### 2. 官方支持全局换肤，不需要再造 `SfButton`

HeroUI OSS 官方支持：

- CSS variables 定义语义主题；
- BEM block/element/modifier 作为全局 recipe；
- `data-hovered`、`data-pressed`、`data-focus-visible` 等状态属性；
- `className`、render props、variant functions；
- selective CSS import，甚至 headless CSS 模式。

[HeroUI OSS Theming](https://heroui.com/en/docs/react/getting-started/theming)、[HeroUI OSS Styling](https://heroui.com/en/docs/react/getting-started/styling)、[HeroUI Composition](https://heroui.com/en/docs/react/getting-started/composition)

HeroUI Pro 明确复用 OSS 的 CSS variables、BEM 和 `@theme` 体系；Design Systems 或 Pro theme 能同时影响 OSS 与 Pro 组件。[HeroUI Pro Theming](https://heroui.pro/docs/react/getting-started/theming)

StoneFlow 已经采用这条路线：

- [`src/styles/index.css`](../../src/styles/index.css) 按 `tailwindcss → @heroui/styles → @heroui-pro/react/css → StoneFlow overrides` 导入；
- [`theme.css`](../../src/styles/theme.css) 是语义值 Owner；
- [`components.css`](../../src/styles/components.css) 是公共 recipe Owner；
- [`A3-界面系统.md`](../01-架构/A3-界面系统.md) 和 [`ADR-0002`](../01-架构/adr/ADR-0002-heroui-ui-platform.md) 已明确禁止一对一 wrapper、第二套 token runtime 和页面私有皮肤。

因此，Lab 应直接渲染真实 HeroUI/StoneFlow 组件；不要为了陈列再创建一套“展示专用组件库”。

### 3. 本地/离线浏览的真实边界

**可以离线浏览已实现的交互样例，但不能零成本获得离线官方文档镜像。**

- 当前两个 npm 包的发布内容都只有 `dist`，包含运行代码、类型和 CSS；官方 MDX 文档和完整 examples 不在安装包中。[本地 OSS package manifest](../../node_modules/@heroui/react/package.json)、[本地 Pro package manifest](../../node_modules/@heroui-pro/react/package.json)
- 只要 `node_modules` 已完整安装，已有依赖、字体和 CSS 可以由本地 Vite Lab 离线渲染。
- API、最新组件清单、BEM CSS 和上游 examples 应继续通过官方 MCP/源码按需查询，不复制到仓库。[HeroUI Pro MCP 官方文档](https://heroui.pro/docs/react/getting-started/mcp-server)
- Pro 有 **16 个 subpath-only 组件**；Map、Charts/KPI、RichTextEditor、Markdown、Carousel、CodeBlock/ChatTool、NumberStepper 等需要额外 peer dependencies。[HeroUI Pro Installation](https://heroui.pro/docs/react/getting-started/installation#ssr-and-subpath-imports)
- StoneFlow 当前没有安装 `recharts`、`maplibre-gl`、Tiptap、Embla、Shiki、`@number-flow/react`、`streamdown`、`marked`。为“以后也许会看”一次性安装全部依赖，既扩大供应链又增加 bundle/安装维护，没有必要。[`package.json`](../../package.json)

结论：HeroUI 视图应允许“尚未建立本地样例”，不要承诺 136 个全部可运行。

### 4. Pro 许可边界

HeroUI Pro 官方许可允许在 Updates Window 结束后继续使用已取得版本，并区分本地 Personal Token 与 CI/CD Token。[HeroUI Pro Licensing](https://heroui.pro/docs/react/getting-started/licensing)

StoneFlow 自己的 [`ADR-0002`](../01-架构/adr/ADR-0002-heroui-ui-platform.md) 进一步限制：不对外提供 Pro 源码、模板、私有 CDN 响应或解包资产。因此：

- 私有、本地、仅开发期的 Lab 符合当前项目边界；
- 不应把它发布成独立公共 HeroUI Pro 浏览器；
- 若未来需要对外托管或给非授权成员共享，应先重新确认准确许可条款，而不是从本文推断授权。

## 五、为什么不建议两个“全量组件页”

### 1. 全量 StoneFlow 页会把文件清单误当视觉系统

105 个 `components/*.tsx` 非测试文件中，很多需要 Router、QueryClient、应用状态、Tauri IPC、Portal 容器和真实几何。为了让它们全部脱离应用渲染，必须维护大量 mocks、fixtures 和 Provider，最终得到的是第二个应用装配层。

更糟的是，文件数量会奖励错误抽象：一个内部 helper 被抽成组件就自动进入展厅，而跨多个文件形成的真实用户表面反而被拆散。

### 2. 全量 HeroUI 页会复制官方维护责任

136 只是顶层组件数量，尚未计算 variant、size、disabled、invalid、loading、open、selection、responsive 等状态。每次 HeroUI beta/OSS 升级，本地 examples、compound anatomy、BEM contract 和 optional peers 都可能变化。

StoneFlow 当前 ADR 已承认：集中 recipe 与 HeroUI BEM/data-state 合同存在版本耦合，升级时必须复核代表状态。[`ADR-0002`](../01-架构/adr/ADR-0002-heroui-ui-platform.md)

把所有上游 examples 复制进仓库，只会把“官网很卡”转换成“本地文档很快过期”。

### 3. 一张长页面不利于交互检查

Overlay、Popover、Calendar、Command、Sidebar、Focus trap 和键盘导航需要真实交互；一次挂载大量复杂组件还会造成 portal 冲突、全局快捷键冲突和无意义的运行成本。

正确方式是搜索/分类后**只挂载当前审查场景**，并让人完整走一遍鼠标、键盘、窄宽度和错误状态。

## 六、方案比较

| 方案 | 优点 | 主要成本/风险 | 结论 |
| --- | --- | --- | --- |
| 只在真实 App 中巡视 | 零新代码；拥有真实数据、Tauri 与几何 | 难稳定复现 Empty/Invalid/Loading；状态分散；容易漏项 | 必须保留，作为最终验收，不足以单独承担发现工作 |
| 正式 Router 下 `/debug/ui-lab` | 复用所有 Provider、Portal、主题与路由 | 会进入 route tree/正式 bundle；易依赖业务数据；发布隔离要额外守卫 | 只给必须依赖真实 App/Tauri 的少量 scene 使用 |
| **独立 Vite HTML 入口，一个 Lab 两个视图** | 复用当前依赖与主题；不接业务路由；可用 fixture；最小配置 | 需要维护一个入口和有限场景；真实 Tauri 行为仍要回 App 验收 | **当前推荐** |
| Storybook | 搜索、isolated iframe、Controls、stories、A11y、interaction/visual tests 均成熟 | 当前未安装；需要 decorators/mocks；每个 story 都是长期维护资产 | 当 stories 开始承担共享文档或回归测试时升级 |
| 独立仓库/独立 Vite 项目 | 与产品代码完全隔离；可跨项目共享 | 版本、主题、许可和 example 全部漂移；重复安装 | 只有多个产品明确共用同一实验室时才考虑 |
| 继续扩写静态 HTML 原型 | 打开快；适合纯视觉草图 | 不是真实 HeroUI，不验证 React Aria、Portal、Focus 或键盘 | 保留为历史素材，不作为验收台 |

Vite 官方把根目录 HTML 视为一等入口，开发期可以直接访问任意根 HTML；生产多页构建只包含显式配置的 HTML inputs。[Vite HTML features](https://vite.dev/guide/features#html)、[Vite Multi-Page App](https://vite.dev/guide/build#multi-page-app)

StoneFlow 当前 [`vite.config.ts`](../../vite.config.ts) 的生产 inputs 只有 `index.html` 和 `launcher.html`。这使“根级独立 Lab HTML、但不加入 production inputs”成为现阶段隔离成本最低的方案。真正实现时仍应通过构建产物检查证明 Lab 未被发布，不能只依赖配置阅读。

Storybook 的长处也很明确：一个 story 表示一个离散组件状态；Controls 可以动态修改 args；`play` 可执行交互；A11y 与 Visual Tests 可以把 stories 变成检查资产。[Browse Stories](https://storybook.js.org/docs/get-started/browse-stories)、[Controls](https://storybook.js.org/docs/essentials/controls)、[Interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing)、[Visual tests](https://storybook.js.org/docs/writing-tests/visual-testing)

这些能力只有在项目决定维护 stories 时才产生收益。当前用户目标是“更快发现肉眼问题”，独立 Vite Lab 足够。

## 七、推荐的最小 Lab 形态

### 1. 一个入口，两个视图，不做两套基础设施

```text
UI Lab
├── StoneFlow 状态矩阵
│   ├── 基础：颜色 / 字体 / 间距 / 半径 / Focus
│   ├── Controls：Button / Input / Select / Switch
│   ├── Navigation：Breadcrumb / Sidebar / Toolbar
│   ├── Collections：Row / List / Empty / Loading
│   └── Overlays：Dropdown / Popover / Modal / Sheet
└── HeroUI 候选库
    ├── 当前已使用
    ├── 准备替换自建实现
    └── 按需评估的 OSS / Pro
```

### 2. StoneFlow 视图先覆盖四个已知高杠杆家族

第一版只需要：

1. Breadcrumbs：普通、Hover、Current、截断、键盘焦点；
2. Buttons：Primary/Secondary/Tertiary/Ghost/Danger，sm/md/lg，Disabled/Pending；
3. Fields：Pointer focus、Keyboard focus-visible、Invalid、Disabled、Read-only；
4. Sidebar：Rest/Hover/Current/Keyboard focus、图标/文字、分组、32px 与上游默认密度对照。

这四类已经能解释用户当前列举的大多数不适感，而且都能回到 `theme.css` / `components.css` 两个集中 Owner。没有证据前，不要先搭建 Charts、Kanban、Map、AI Chat 等与 StoneFlow 当前核心路径无关的展品。

### 3. HeroUI 视图只做“决策样例”

每个本地 HeroUI 样例必须回答至少一个实际问题：

- 这个组件能否替换现有自建实现？
- 它在 StoneFlow 主题下是否可接受？
- 它的键盘/Overlay/集合行为是否满足当前产品合同？
- 它是否带来新的 optional peer dependency？

如果没有问题要回答，就不为它写 example。完整名字、API 和官方 examples 继续使用 MCP/官方文档查询。

### 4. 推荐做“上游默认 vs StoneFlow 主题”并排比较

HeroUI 默认主题与 `[data-theme="stoneflow-light"]` 可以在不同子树中渲染。并排比较有三个好处：

- 立刻看出问题来自上游 recipe 还是 StoneFlow override；
- 避免误把 HeroUI 的行为问题当成颜色问题；
- 升级时能快速发现 BEM/data-state 合同变化。

这仍需真实原型验证 CSS scope、Portal 和 overlay container；本文只确认官方主题机制与当前 StoneFlow scope 允许这种方案，不宣称已运行通过。

## 八、肉眼发现问题的固定巡视法

页面只是容器；真正提高发现率的是一份短而固定的巡视顺序。

### 1. 每个审查单元依次检查

1. **层级**：第一眼是否知道主信息和主动作；Accent 是否被滥用；
2. **几何**：高度、padding、文字/图标光学对齐、点击区是否舒适；
3. **颜色**：Rest/Hover/Selected/Disabled 是否能区分，是否只用颜色表达含义；
4. **边界**：Border、Shadow、Radius 是否重复表达层级；
5. **状态**：Hover、Pressed、Open、Current/Selected、Loading、Invalid；
6. **输入方式**：鼠标、键盘、滚轮/触控板；
7. **宽度与缩放**：窄容器、长中文、200% zoom；
8. **主题/Accent**：至少默认 Accent 和一个低饱和 Accent。

键盘焦点不能因为“不喜欢框”而被删除；触控目标也不能只按视觉高度判断。WCAG 2.2 的最低目标尺寸是 24×24 CSS px，较大的目标仍是更易用的最佳实践。[W3C Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

### 2. 每个发现只记录一份根因

推荐记录字段：

| 字段 | 示例 |
| --- | --- |
| Surface | AppBreadcrumb |
| State/Input | Hover / Pointer |
| Theme/Viewport | stoneflow-light / 1280px |
| Observed | 链接出现下划线，当前项呈 Accent link |
| Expected rule | Breadcrumb 只用结构和字重表达层级 |
| Likely owner | `src/styles/components.css` |
| Evidence | 截图 + 路径 + 复现步骤 |
| Reach | 所有使用 AppBreadcrumb 的页面 |

不要在 Lab 里再造 issue tracker。确认问题后写入仓库既有本地工作文档流程；Lab 只负责稳定复现和截图。

### 3. 最终仍回真实 App 验收

Lab 能证明：

- 组件在固定 fixture 中的外观和基础交互；
- 主题/recipe 的集中影响；
- 某些状态可以稳定复现。

Lab 不能证明：

- Tauri WebView、macOS/Windows 字体渲染和原生窗口几何；
- Router/Query/IPC 组合后的真实流程；
- Portal 容器、全局快捷键和多个 Overlay 的优先级；
- 实际用户数据长度与滚动压力。

因此每轮修复后还要做最小真实 App smoke check；不能把 Lab 通过写成桌面端验收通过。

## 九、什么时候升级到 Storybook 或扩大范围

### 引入 Storybook 的触发条件

出现以下任一真实需求时再评估：

- 多人需要共享、搜索和评审 stories；
- stories 要进入 CI，承担 render/interaction/a11y/visual regression；
- Controls 能显著减少大量手写状态切换；
- 产品组件已被整理为可独立渲染的稳定 public surface。

不要因为“组件很多”就自动引入 Storybook；组件越 connected，Storybook mocks 的维护成本越高。[Storybook Building pages](https://storybook.js.org/docs/writing-stories/build-pages-with-storybook)

### 扩大 HeroUI 本地样例的触发条件

只有当某个 Feature 准备采用该组件，或某个现有自建实现进入替换评估时添加。添加前按官方流程重新查询 `list_components → get_component_docs → get_css`，不从旧样例猜 API。[HeroUI Pro MCP 官方文档](https://heroui.pro/docs/react/getting-started/mcp-server)

### 使用正式 debug route 的触发条件

只有 scene 必须依赖 Tauri、应用 Router、QueryClient、真实 Portal container 或全局快捷键时，才放入正式 App 的受控 debug route。当前仓库已有 `/debug/activity`、`/debug/task-board` 模式，但两者的访问守卫不同；新增前必须明确生产隔离合同。[`debug.activity.tsx`](../../src/routes/debug.activity.tsx)、[`debug.task-board.tsx`](../../src/routes/debug.task-board.tsx)

## 十、建议决策

### 建议现在确认的方向

- **需要**：一个开发期 UI Lab；
- **合并**：StoneFlow 与 HeroUI 两个视图共用一个入口、主题和导航；
- **StoneFlow 优先**：先建立真实产品状态矩阵；
- **HeroUI 按需**：只做当前使用/候选替换组件，不追求 136 个全部实现；
- **保留真实 App 巡视**：Lab 负责发现与复现，App 负责集成验收；
- **暂不 Storybook**：等 stories 真正承担共享文档或回归测试再升级。

### 明确不建议

- 不维护“每个 `.tsx` 文件一个展品”的全量项目页面；
- 不复制 HeroUI 官网的完整 MDX/API/examples；
- 不一次安装所有 Pro optional peers；
- 不为 Lab 创建第二套 wrapper、token 或 design-system package；
- 不把私有 Pro Lab 发布成公共组件浏览器；
- 不把静态 HTML 外观检查当成真实 HeroUI/React Aria 验收。

## 十一、仍未确认的事项

1. 本轮没有启动 Vite/Tauri，也没有做视觉运行时检查；用户列举的具体现象只完成了源码 Owner 对照，没有宣布任何视觉问题已经复现或修复。
2. “默认主题与 StoneFlow 主题同页并排”需要实现时验证 Overlay portal 的主题继承和容器 scope。
3. 独立 Lab 未进入生产包需要以实际 `vite build` 产物验证，当前只确认生产 input 配置没有 Lab。
4. HeroUI 官方组件清单会继续变化；本文的 71/65/136 是 2026-08-26 快照，不应复制成长期源码常量。
5. HeroUI Pro 对公开托管展示的准确法律边界未从当前 plain-language Licensing 页得到完整结论；本文只建议遵守 StoneFlow 已有的更严格私有边界。

## 十二、一手资料索引

### HeroUI

- [HeroUI OSS 全部组件](https://heroui.com/en/docs/react/components)
- [HeroUI Pro 全部组件](https://heroui.pro/docs/react/components)
- [HeroUI Pro MCP](https://heroui.pro/docs/react/getting-started/mcp-server)
- [HeroUI OSS Theming](https://heroui.com/en/docs/react/getting-started/theming)
- [HeroUI OSS Styling](https://heroui.com/en/docs/react/getting-started/styling)
- [HeroUI Composition](https://heroui.com/en/docs/react/getting-started/composition)
- [HeroUI Pro Installation](https://heroui.pro/docs/react/getting-started/installation)
- [HeroUI Pro Theming](https://heroui.pro/docs/react/getting-started/theming)
- [HeroUI Pro Licensing](https://heroui.pro/docs/react/getting-started/licensing)
- [HeroUI Button](https://heroui.com/en/docs/react/components/button)
- [HeroUI Breadcrumbs CSS](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/breadcrumbs.css)
- [HeroUI Button CSS](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/button.css)
- [HeroUI Input CSS](https://github.com/heroui-inc/heroui/blob/v3/packages/styles/components/input.css)
- [HeroUI Pro Sidebar](https://heroui.pro/docs/react/components/sidebar)

### Vite / Storybook / W3C

- [Vite HTML entry](https://vite.dev/guide/features#html)
- [Vite Multi-Page App](https://vite.dev/guide/build#multi-page-app)
- [Storybook Browse Stories](https://storybook.js.org/docs/get-started/browse-stories)
- [Storybook Controls](https://storybook.js.org/docs/essentials/controls)
- [Storybook Interaction tests](https://storybook.js.org/docs/writing-tests/interaction-testing)
- [Storybook Visual tests](https://storybook.js.org/docs/writing-tests/visual-testing)
- [Storybook Building pages](https://storybook.js.org/docs/writing-stories/build-pages-with-storybook)
- [W3C Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)
- [W3C Target Size (Minimum)](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)

### StoneFlow 当前事实

- [`package.json`](../../package.json)
- [`vite.config.ts`](../../vite.config.ts)
- [`src/styles/index.css`](../../src/styles/index.css)
- [`src/styles/theme.css`](../../src/styles/theme.css)
- [`src/styles/components.css`](../../src/styles/components.css)
- [`Documents/01-架构/A3-界面系统.md`](../01-架构/A3-界面系统.md)
- [`Documents/01-架构/adr/ADR-0002-heroui-ui-platform.md`](../01-架构/adr/ADR-0002-heroui-ui-platform.md)
- [`src/shared/components/AppBreadcrumb.tsx`](../../src/shared/components/AppBreadcrumb.tsx)
- [`Documents/99-素材/02-HTML原型/stoneflow_heroui_light_v1.html`](../99-素材/02-HTML原型/stoneflow_heroui_light_v1.html)
