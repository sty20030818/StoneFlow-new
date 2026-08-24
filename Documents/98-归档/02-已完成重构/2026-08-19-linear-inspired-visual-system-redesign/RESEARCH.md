# StoneFlow Linear-inspired 视觉系统研究

> 日期：2026-08-19
> 范围：Linear 官方公开设计资料、HeroUI OSS/Pro 官方文档与当前已安装包、Tailwind CSS v4 官方文档、W3C/WCAG 2.2
> 资料边界：只采用一手资料和当前仓库；不采用第三方“Linear 风格”教程，不反推或复制 Linear 私有 token、源代码、字体文件或图标资产

## 结论

StoneFlow 不应该继续接受 HeroUI 默认外观，也不应该重新造一套组件库。长期成本最低的路线是：

1. **Linear 只提供视觉原则与公开界面参照，不提供可复制的私有设计系统。**目标应定义为独立实现的 Linear-inspired 桌面生产力界面，而不是无法验证的 1:1 复刻。
2. **HeroUI 继续负责行为、可访问性与组件结构，StoneFlow 统一负责视觉。**HeroUI v3 明确把行为与 CSS 分离，并允许通过语义变量、BEM 类和状态 data attribute 全局换肤；HeroUI Pro 复用同一套机制。[HeroUI v3 设计原则](https://heroui.com/en/docs/react/releases/v3-0-0#design-principles)、[HeroUI Pro Theming](https://heroui.pro/docs/react/getting-started/theming)
3. **不新增第二套 design-system runtime、包装组件或 token 包。**复用现有 `src/styles/theme.css` 与 `src/styles/components.css` 两个视觉所有者：前者定义语义 token，后者定义 OSS/Pro 组件 recipe；功能组件只表达布局与产品语义。
4. **视觉方向以 Linear 2026 refresh 为主、2024 redesign 为补充。**核心是暖灰中性色、主内容优先、导航后退、较小图标、紧凑但不拥挤、少而柔和的分隔、有限强调色，以及跨视图一致的 header/navigation/view controls。[Linear 2026 refresh](https://linear.app/now/behind-the-latest-design-refresh)、[Linear 2024 redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)
5. **先建立少量代表性表面和完整状态矩阵，再扩展到全应用。**不先设计几十个组件 token；先证明同一套规则能覆盖 Sidebar、任务列表、Header/View controls、Menu/Popover、Dialog/Sheet、Settings/Form 六类表面。

## 证据标记

- **官方事实**：来源明确写出的产品或技术能力。
- **公开界面推断**：从 Linear 官方发布的截图和对比图中观察到的相对关系，不等同于内部规格。
- **不能确认**：公开资料不能证明的精确值或实现细节，必须由 StoneFlow 自己决定或在真实 Linear 客户端中测量。

## 一、Linear 的官方设计事实

### 1. 信息密度不是问题，平均用力才是问题

Linear 2026 refresh 的目标不是降低信息量，而是在保留高信息密度的同时，让核心工作区获得最高视觉权重，辅助导航退到背景。[官方设计文章](https://linear.app/now/behind-the-latest-design-refresh)

对 StoneFlow 的约束：

- 任务标题、当前视图、当前操作是第一层。
- 状态、项目、标签、计数等元信息是第二层。
- Sidebar 分组名、未激活导航、次级图标是第三层。
- 不用边框、背景、阴影同时强调同一对象。

### 2. 2026 refresh 的可复用特征

Linear 官方明确列出了这些变化：[设计文章](https://linear.app/now/behind-the-latest-design-refresh)、[发布说明](https://linear.app/changelog/2026-03-12-ui-refresh)

| 维度 | 官方事实 | StoneFlow 可独立实现的约束 |
| --- | --- | --- |
| Sidebar | 导航侧栏更暗；非激活文字更弱；图标更小；纵向留白反而增加 | Sidebar 使用独立的低强调 surface；缩小图标不等于缩小点击区；分组之间比行内元素更需要留白 |
| Tabs | 标签栏更紧凑，不再无条件撑满宽度；圆角、图标和文字都更小 | 页签宽度随内容；只保留必要文字；选中态用克制 surface，不用大面积高饱和色 |
| Icons | 减少图标数量、缩小图标，并移除不必要的彩色图标背景 | 图标承担识别或操作时才出现；状态色只服务领域含义，不服务装饰 |
| Borders | 减少无理由的分隔线，降低边界对比，并用更柔和的边缘表达结构 | 优先 spacing/surface 分层；边框只用于需要说明容器关系、输入边界或焦点的地方 |
| Header / controls | Projects、Issues、Reviews、Documents 等区域的 header、navigation、view controls 被统一 | 同层级表面必须共享高度、对齐、文字等级和控制位置，不能按页面自由发挥 |
| Palette | 默认色从偏冷蓝逐步靠向较暖、较低饱和度但仍清晰的灰色 | 中性色只带很弱暖度；主强调色不参与所有中性 surface 的染色 |

官方截图还展示了选中导航采用低对比 surface、未激活项明显后退，以及控件边缘柔和的方向。这里只能把它们作为**相对层级推断**；截图经过缩放和压缩，不能据此宣称具体色值、半径或像素尺寸。[Linear 2026 官方对比图所在文章](https://linear.app/now/behind-the-latest-design-refresh)

### 3. 2024 redesign 补充了系统层证据

Linear 2024 redesign 公开了以下事实：[官方设计文章](https://linear.app/now/how-we-redesigned-the-linear-ui)

- 设计重点覆盖 Sidebar、Tabs、Headers、Panels，并强调纵横对齐与跨 macOS、Windows、浏览器环境的一致性。
- 明暗主题使用同一种主题生成语言；surface、text、icon、control 使用别名角色，而不是页面直接取基础色。
- 当时的主题生成以 base color、accent color、contrast 三个输入生成大量语义结果；它还提供更高对比模式。
- 为减弱蓝色 chrome 对中性色的污染，团队降低了蓝色参与颜色计算的程度，并提高了正文与中性图标的对比。
- Heading 使用 Inter Display，正文继续用 Inter。这个事实证明“标题与正文有不同角色”，不代表中文桌面应用必须复制同一字体。
- 团队按 List、Board、Split 等视图类型做 stress test，再定义 Sidebar、Tabs、App headers、View headers 的行为，然后分阶段落地。

对 StoneFlow 的直接启示是：**先定义角色和关系，再选具体值；先跨表面验证，再批量迁移。**

### 4. 公开资料不能确认的 Linear 规格

下列内容不能从官方文章可靠得到：

- 任务行是否固定为 `44px`；
- 正文是否固定为 `13px`；
- 每一档 radius、spacing、shadow 的精确数值；
- hover、selected、selected + hover、focus-visible 的私有 token；
- 动画持续时间与 easing；
- 当前客户端完整的 light/dark token 表；
- 图标的私有绘制网格。

这些值要么在真实客户端中测量，要么由 StoneFlow 在原型中独立确定。营销截图不能作为像素级规格。

## 二、建议采用的 Linear-inspired 视觉特征矩阵

下表是基于官方事实做出的**独立实现建议**，不是 Linear 内部规范。

| 视觉轴 | StoneFlow 建议 | 明确不做 |
| --- | --- | --- |
| 基础气质 | 冷静、低噪、键盘优先的桌面工作台 | HeroUI 默认的大圆角卡片感、营销页式留白、玻璃拟态 |
| 中性色 | 低色度暖灰；Light/Dark 使用同一组语义角色 | 用品牌蓝给所有灰色 surface 染色 |
| Accent | 只用于主要动作、选择、链接、进度与少量领域状态 | 每个 hover、边框、Sidebar 都使用 accent |
| Surface | 至少区分 page、navigation、surface、overlay，但通过轻微明度差而非重阴影分层 | 每个 section 都包 Card |
| Border | 默认弱，按结构需要出现；输入、浮层和 focus 可更明确 | 全页面网格线、双层边框、边框与阴影重复表达 |
| Radius | 小到中等、同类一致；只让 compact tabs/chips 等适合胶囊的对象接近 pill | 所有 Button、Card、Modal 一律大圆角 |
| Typography | 中文正文以系统 UI 字体栈和可读性为先；通过字号、字重、颜色建立 3–4 层层级 | 为模仿 Inter Display 牺牲中文 fallback，或大量 uppercase/字距装饰 |
| Iconography | 小而清楚；视觉尺寸与可点击面积分离；只给领域状态着色 | 彩色图标底板、每行堆叠多个弱价值图标 |
| Density | 列表高密度；分组之间留白大于行内间距；控制高度按使用频率分档 | 把“紧凑”理解成所有元素都更小、更挤 |
| Shadow | 只服务 overlay、dragging 或必须表达的 elevation | 静态列表、Sidebar、普通 Card 普遍投影 |
| Motion | 只用短、可中断的状态过渡；尊重 reduced motion | 装饰性浮动、缩放、弹簧动画 |

## 三、HeroUI OSS/Pro 能否支撑完整换肤

答案是**可以，而且不需要新建包装组件层**。

### 1. 官方能力边界

HeroUI v3 的官方架构把 `@heroui/react` 的行为与 `@heroui/styles` 的 CSS 分开；组件建立在 React Aria 之上，提供键盘、焦点、屏幕阅读器与 ARIA 行为。[HeroUI v3 release](https://heroui.com/en/docs/react/releases/v3-0-0)

HeroUI OSS 的全局视觉入口包括：

- 主题语义 CSS variables；
- BEM component/element/modifier 类；
- `data-hovered`、`data-pressed`、`data-focus-visible` 等状态属性；
- `className`、render props 与公开 component CSS。[OSS Theming](https://heroui.com/en/docs/react/getting-started/theming)、[OSS Styling](https://heroui.com/en/docs/react/getting-started/styling)

HeroUI Pro 明确复用同一套 CSS variable、BEM、`@theme` 和状态机制；Pro 只是类名前缀不同，例如 `.command`、`.sheet`、`.sidebar`。Pro 主题本身也会同时覆盖语义变量和 OSS/Pro BEM classes，证明跨两套组件做统一视觉层是官方支持路径。[Pro Theming](https://heroui.pro/docs/react/getting-started/theming)、[Pro Styling](https://heroui.pro/docs/react/getting-started/styling)

### 2. CSS import 顺序是硬约束

HeroUI Pro 官方要求顺序为：

```css
@import "tailwindcss";
@import "@heroui/styles";
@import "@heroui-pro/react/css";
```

Pro CSS 构建在 OSS CSS 之上，反转顺序会破坏样式。[Pro installation](https://heroui.pro/docs/react/getting-started/installation#import-styles)

当前 StoneFlow 的 [src/styles/index.css](../../../../src/styles/index.css) 已遵守这个顺序；新系统只需要让 StoneFlow 的主题与组件 override 继续位于三者之后，不需要再造新的 CSS runtime。

### 3. Tailwind v4 的职责边界

Tailwind v4 的 `@theme` 变量同时会生成 utility API；普通 `:root`/`[data-theme]` CSS variables 则不会。官方建议：需要映射为 utility 的 design token 用 `@theme`，仅供 CSS 内部使用的变量保留为普通 CSS variable。[Tailwind theme variables](https://tailwindcss.com/docs/theme)

因此 StoneFlow 应采用：

- `[data-theme="stoneflow-light"]` / dark：定义 HeroUI 已有的语义角色与少量 StoneFlow 特有角色；
- `@theme inline`：只桥接确实需要在 JSX utility 中使用的变量；
- `@layer components`：统一覆盖 HeroUI OSS/Pro 的 BEM recipe；
- 功能组件：只选择语义状态和处理布局，不携带原始色值。

### 4. 不建议直接切到完全 headless

HeroUI OSS 官方支持只导入 base、完全自写组件 CSS 的 headless 模式。[OSS Theming](https://heroui.com/en/docs/react/getting-started/theming#headless-mode) 但 StoneFlow 同时依赖 Pro，而 Pro 官方要求自己的 CSS 构建在 OSS 层之上。现在完全 headless 会迫使项目一次性重写全部在用组件的结构样式、状态样式和平台细节，收益尚未证明。

更小且长期可控的做法是：

1. 保留官方结构 CSS；
2. 对实际使用的 OSS/Pro 组件做全局 visual hard cut；
3. 每个迁移后的表面禁止依赖未审视的默认外观；
4. 只有当完整 inventory 证明官方 CSS 大部分无用且默认值持续泄漏时，再评估 selective import 或 headless。

## 四、StoneFlow 的建议样式所有权

不新增文件层级，直接收敛现有所有者：

| 文件 | 唯一职责 | 禁止内容 |
| --- | --- | --- |
| [src/styles/index.css](../../../../src/styles/index.css) | 声明 layer/import 顺序 | 具体 token、组件 selector、页面特例 |
| [src/styles/theme.css](../../../../src/styles/theme.css) | Light/Dark 语义 token 与必要的 Tailwind bridge | 页面 selector、组件 BEM、重复 primitive palette |
| [src/styles/components.css](../../../../src/styles/components.css) | HeroUI OSS/Pro 全局 component recipe 与完整交互状态 | 原始颜色、业务规则、页面私有修补 |
| [src/styles/base.css](../../../../src/styles/base.css) | HTML/body、字体渲染、选择、平台级基础规则 | 组件 recipe |
| `src/styles/utilities.css`（后续 hard cut 已删除） | 至少两个真实消费者的产品级 utility | 为未来预留的 class、组件皮肤 |
| Feature component | 结构、布局、产品语义、选择正确 HeroUI variant/state，以及虚拟列表等确需运行时计算的合法动态几何 | hex/oklch 原值、复制全局 Button/Menu/List recipe、静态高度的 inline style |

现状证据：

- [package.json](../../../../package.json) 当前固定 `@heroui/react 3.2.4`、`@heroui/styles 3.2.4`、`@heroui-pro/react 1.0.0-beta.8`，并使用 Tailwind CSS v4。
- [src/styles/theme.css](../../../../src/styles/theme.css) 已有 HeroUI 语义变量，但仍直接使用大量 hex；这不是问题本身，问题是同一颜色又散落进入 component recipe。
- [src/styles/components.css](../../../../src/styles/components.css) 目前只统一覆盖 Button、Input/Select、Sidebar、Menu/ListBox/ListView；Card、Modal、Alert、Radio、Switch、Toggle、Chip、Popover 等仍使用 HeroUI 默认 geometry，这正是“界面大部分像原生 HeroUI”的直接来源。
- [src/styles/index.css](../../../../src/styles/index.css) 仍导入旧 primitive/semantic/layout/dark 与 shadcn adapter。它们属于迁移遗留，不应该成为新视觉系统的第二来源。

建议 hard cut 规则：**同一语义只保留一个 token；同一 HeroUI component recipe 只保留一个全局定义；零消费者旧 token/adapter 直接删除。**

明确不新增：`SfButton`/`SfCard` 一类纯换皮 wrapper、TypeScript token object、独立 design-system package、第二套 variant runtime，以及当前没有消费者需求的 Storybook。HeroUI 的公开 compound API 与全局 BEM/data-state recipe 已覆盖这些职责；只有产品语义或结构组合真正新增时才创建组件。

## 五、必须覆盖的组件状态矩阵

官方 Linear 资料没有公开状态 token；StoneFlow 必须自己定义并验证。每类交互组件至少覆盖：

| 状态 | 视觉合同 |
| --- | --- |
| Rest | 不抢主内容注意力，仍能识别是否可交互 |
| Pointer hover | 只用轻微 neutral surface 变化；不显示键盘 focus ring |
| Pressed | 与 hover 有可感知差异，但不依赖明显缩放 |
| Selected | 使用 accent-soft 或同等语义 surface；默认无额外边框 |
| Selected + hover | 比 selected 稍深/稍灰，仍不新增边框 |
| Focus-visible | 仅键盘/辅助输入显示；颜色使用独立中性 focus token，不借用 selection 蓝色 |
| Selected + focus-visible | 同时保留 selected fill 和可辨识 focus indicator |
| Open / expanded | 说明 popup/panel 已打开；不要把它误作 selected |
| Disabled | 降低权重但保持标签可读；鼠标与键盘都不能触发 |
| Loading | 保持组件占位与宽高，避免界面跳动 |
| Invalid / danger | 色彩必须表达错误语义，不能只靠红色 |
| Context-menu hover | 右键目标保持正常 hover；打开菜单本身不强制变 selected |
| Drag / drop target | 只在真实拖拽期间出现，并与 selected/focus 分开 |

这张矩阵应同时用于 Button、row/list item、Sidebar item、Menu item、Tabs、field、Card trigger 和 overlay trigger；不要为每个页面发明独立状态色。

## 六、W3C/WCAG 约束

这些是模仿低对比界面时不能牺牲的底线：

1. **正文对比**：普通文字至少 `4.5:1`，大字号文字至少 `3:1`。[WCAG 2.2 SC 1.4.3](https://www.w3.org/TR/WCAG22/#contrast-minimum)
2. **控件与状态**：识别控件或其 selected/focused 等状态所必需的非文本视觉信息，应与相邻颜色达到 `3:1`。[Understanding Non-text Contrast](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast)
3. **Focus 可见**：键盘可操作组件必须有可见焦点；HeroUI 的 `data-focus-visible`/`:focus-visible` 可以让指针操作不显示相同边框，同时保留键盘焦点。[Understanding Focus Visible](https://www.w3.org/WAI/WCAG22/Understanding/focus-visible)、[HeroUI state styling](https://heroui.com/en/docs/react/getting-started/styling#state-based-styling)
4. **Focus 强度建议**：WCAG 2.2 AAA 的 Focus Appearance 建议焦点指示面积至少等同于 `2 CSS px` 外围，并在 focused/unfocused 同像素间达到 `3:1` 变化。StoneFlow 可把它当内部质量目标，而不要把“灰色”做成几乎不可见。[Understanding Focus Appearance](https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html)
5. **点击目标**：指针目标至少容纳 `24 × 24 CSS px`，或满足官方 spacing exception。图标可以小，但 hit target 不能跟着变小。[Understanding Target Size Minimum](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum)
6. **Hover/focus 浮层**：Tooltip、submenu 等附加内容要可关闭、可移入，并保持到触发条件移除、用户关闭或内容失效。[Understanding Content on Hover or Focus](https://www.w3.org/WAI/WCAG22/Understanding/content-on-hover-or-focus.html)

低噪不等于低可见性。可以弱化装饰边界，但不能弱化识别控件、当前状态和键盘焦点所必需的信号。

## 七、实施前应该先做的最小验证

不先制作完整 token 表。先做一个可丢弃的代表性视觉样片，只验证六类表面：

1. Sidebar：当前项、hover、focus-visible、折叠、计数与分组。
2. Task list：44px 候选行高、普通/hover/selected/selected+hover/focus-visible/open preview/context menu。
3. Header + view controls：标题、tabs/filter/display controls、分隔与 active state。
4. Menu/Popover/Command：overlay、搜索、分组、危险操作与快捷键。
5. Dialog/Sheet/Task detail：层级、边界、标题、正文、footer actions。
6. Settings/Form：field、radio、switch、validation、disabled、help text。

样片同时以 Light/Dark、键盘/指针、100%/125% 缩放检查。只有这六类能共享同一语义语言后，才冻结 token 和 recipe。

## 八、仍需产品决策的问题

研究不能替用户决定以下内容：

1. **复刻边界**：追随 Linear 的原则与相对关系，还是还要对公开客户端做逐像素测量？推荐前者；逐像素测量只用于行高、控制高度、间距等少数几何基准。
2. **品牌 accent**：沿用 StoneFlow 的橙色识别、改为 Linear-like 紫蓝，还是选择全新 accent？推荐保留 StoneFlow 品牌识别，但让 accent 只承担语义强调，不污染中性色。
3. **主题范围**：第一阶段同时完成 Light/Dark，还是 Light 先冻结再映射 Dark？推荐先同时确定语义角色，但只先精修一个主题，避免两套未稳定值并行返工。
4. **密度基线**：任务行 `44px` 是否作为全局列表基准，Sidebar/Menu 是否使用另一档高度？官方资料不能确认，必须用 StoneFlow 真实内容与输入设备验证。
5. **图标策略**：继续使用 Lucide 并统一 stroke/size，还是后续制作 StoneFlow 自有领域图标？推荐先统一 Lucide；只有领域识别不足时再增加少量自有图标。

## 推荐决策

将设计目标写成一句可验收的合同：

> StoneFlow 是一款 Linear-inspired、低噪高密度、键盘优先的跨平台桌面工作台；HeroUI 提供行为和结构，StoneFlow 以单一语义 token 与全局 component recipe 完整拥有视觉；不复制 Linear 私有资产，也不接受未审视的 HeroUI 默认外观。
