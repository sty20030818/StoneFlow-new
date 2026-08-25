# HeroUI UI/UX 还原与组件复用研究

> 日期：2026-08-25
> 状态：研究结论，尚未授权实施
> 适用版本：`@heroui/react@3.2.4`、`@heroui/styles@3.2.4`、`@heroui-pro/react@1.0.0-beta.8`
> 证据范围：HeroUI 官方 MCP 实时清单与组件文档、HeroUI 官方文档/源码、仓库当前磁盘源码与已安装包；研究结论未使用重建前的过期 `.codegraph` 输出，索引已于研究后按授权重建

## 1. 结论先行

StoneFlow 现在不需要再做一轮“把自研组件全部换成 HeroUI”的横向迁移。当前 `src` 已经大面积直接使用 HeroUI，下一阶段应改成**按所有权做纵向硬切**：

- HeroUI 负责标准交互、焦点、键盘、overlay、表单语义、选择控件和通用视觉 recipe。
- StoneFlow 负责领域状态、Command 投影、跨分区 selection、虚拟列表几何、Tauri 原生窗几何、路由与持久化。
- 同名不等于同一职责。`ListView`、`DataGrid`、`Kanban`、`HoverCard`、`AppLayout` 都不能仅凭名字替换现有产品组件。

按收益与长期维护成本排序，推荐优先级是：

1. **P0：删除 `OverlayScrollbar` 视觉实现，保留 `AppScrollArea` 的真实 viewport/context，用 HeroUI `scrollbar` utility 恢复原生滚动条。** 单文件可直接删除 266 行，同时不动 TaskBoard 的虚拟几何所有权。
2. **P0：同步间隔从 `Input type="number"` + 手写字符串解析迁到 OSS `NumberField`。** 让 HeroUI/React Aria 接管步进、数值输入、范围和可访问语义；Tauri 保存时机仍由 StoneFlow 管理。
3. **P0：Space 固定颜色集合从通用 `Select` 迁到 OSS `ColorSwatchPicker`。** 视觉表达更符合“有限调色板”，但数据库仍保存 `colorKey`，不能改存任意颜色字符串。
4. **P1：设置页的开关行仅把标准交互层迁到 Pro `CellSwitch`。** `CellSwitch` 在当前 beta.8 已从根入口真实导出；不要因此删除 `SettingsSection`、诊断信息行等产品布局。
5. **P1：仅在两个“自定义日期”入口试用 OSS `DatePicker`/`Calendar`。** 预设日期、Command 快捷键和 ISO 日期领域值继续由 StoneFlow 管理。
6. **P1：为 PageFrame 混合操作区评估 OSS `Toolbar`。** 目标是统一跨 Toggle/Button 的方向键导航，不是再包一层纯样式 wrapper。

明确不建议：

- 不用 Pro `ListView`、`DataGrid` 或 `Kanban` 替换 `TaskBoard`。
- 不用 `ListView` 替换 Launcher 结果，因为它不能提供“输入框保持 DOM focus + `aria-activedescendant`”的 autocomplete 焦点模型。
- Pro `Command` 当前确实具备该虚拟焦点模型，但整套替换会破坏 Launcher 已冻结的 Tauri 固定壳、Create 独立 focus lane 和 selection feature 所有权；只能另开架构原型，不能在本轮顺手替换。
- 不用 `Breadcrumbs.Item render` 猜测 TanStack Router 集成；当前 `AppBreadcrumb` 的 RAC `Breadcrumb` + TanStack `Link` + HeroUI BEM 样式是有理由的边界。
- 不用 Pro `CellSelect`/`CellSwitch` 一次性替换整个 `settingsShared`；Pro 没有一个名为 Settings 的容器组件。

## 2. 研究方法与证据边界

### 2.1 使用的证据

1. 先通过 HeroUI 官方 MCP `list_components` 获取 2026-08-25 的 OSS + Pro 实时清单，再对候选组件逐一调用 `get_component_docs`；未猜测组件名或 API。
2. 对 `Breadcrumbs` 额外读取官方 OSS 源码；对 Pro `Command` 的 active-descendant 行为核对当前安装包和其 React Aria `Autocomplete` 实现。
3. 核对当前 `package.json`、`bun.lock`、`node_modules` 导出表、CSS utilities，以及 `src` 的真实导入和调用点。
4. 研究开始时 `.codegraph` 的旧索引仍指向已经不存在的 `src/shared/components/base`，因此未采信其结果；索引随后已按授权重建，本文结论仍以磁盘源码和官方资料为准。

### 2.2 尚未验证

- 未启动开发服务，未宣称浏览器 E2E、截图对比或 Tauri 真机验收通过。
- 原生滚动条必须在 macOS WKWebView 和 Windows WebView2 各做一次视觉/拖拽/键盘验收。
- Pro 仍为 beta；“组件存在”不等于其视觉一定符合重构前 UI。
- 本文是组件能力和所有权研究，不替代另一路 UI/UX 截图偏差审计。

## 3. 当前版本与采用基线

### 3.1 依赖与样式顺序已经正确

当前仓库事实：

- `package.json:34-36`：Pro `1.0.0-beta.8`，OSS/Styles `3.2.4`。
- `package.json:38`：`@react-aria/utils@3.34.1` 已直接声明，满足 Pro beta.8 新 peer 要求。
- `package.json:88-90`：`@heroui-pro/react` 在 Bun `trustedDependencies` 中。
- `src/styles/index.css:3-5`：Tailwind → `@heroui/styles` → `@heroui-pro/react/css`，符合官方顺序。
- HeroUI v3 要求 React 19、Tailwind CSS 4，且不需要 Provider；当前仓库满足这些前提。[HeroUI OSS Quick Start](https://heroui.com/en/docs/react/getting-started/quick-start)、[HeroUI Pro Installation](https://heroui.pro/docs/react/getting-started/installation)

静态扫描 `src` 得到 155 条 HeroUI import，分布在 136 个 TS/TSX 文件中。项目已经在使用 Button、Modal、AlertDialog、Dropdown、Tooltip、Sidebar、Sheet、Resizable、ContextMenu、Command、EmptyState、ListView、ActionBar、Timeline、ScrollShadow、Surface、ToggleButtonGroup 等；这不是“HeroUI 尚未落地”的状态。

### 3.2 官方实时组件面

HeroUI 官方 MCP 在本次研究时返回：

- OSS：71 个组件。
- Pro：65 个组件。
- 合计：136 个组件。

与 StoneFlow 相关的主要组件面如下：

| 能力 | OSS | Pro |
|---|---|---|
| 表单 | NumberField、DatePicker、Calendar、ColorSwatchPicker、Select、ComboBox、Switch、ToggleButtonGroup、Form | CellSelect、CellSwitch、CellSlider、CellColorPicker、InlineSelect、NumberStepper、NativeSelect、RadioButtonGroup、CheckboxButtonGroup |
| Collection | ListBox、Table、TagGroup、Toolbar | ListView、DataGrid、Kanban、FileTree、ActionBar |
| 导航 | Breadcrumbs、Tabs | Sidebar、Navbar、Segment、Stepper、Command、AppLayout |
| Overlay | Modal、Drawer、Popover、Tooltip、Dropdown | Sheet、ContextMenu、HoverCard |
| 数据/反馈 | Alert、Skeleton、Toast、Progress、ScrollShadow | EmptyState、Timeline、KPI、TrendChip、NumberValue |

完整索引见 [HeroUI OSS Components](https://heroui.com/en/docs/react/components) 与 [HeroUI Pro Components](https://heroui.pro/docs/react/components)。组件数量是本次 MCP 快照，不应当作永久常量。

## 4. 所有权边界

| HeroUI 应接管 | StoneFlow 必须保留 |
|---|---|
| `Button.onPress` 的 pointer/keyboard/assistive input 统一语义 | Command registry、命令可用性、快捷键策略与执行上下文 |
| Modal/Popover/Dropdown/Tooltip 的 overlay、dismiss、焦点恢复 | Tauri Launcher/主窗尺寸、透明裁切、窗口 session 与 native shadow |
| NumberField、DatePicker、ColorSwatchPicker、Switch 的输入与键盘语义 | ISO 日期、`colorKey`、同步策略、保存/回滚和 Tauri IPC |
| ListView/DataGrid 的通用单列表/表格 collection 行为 | TaskBoard 跨分区 selection、sticky header、分页占位与焦点桥 |
| Toolbar/ToggleButtonGroup 的通用方向键与 selection 语义 | PageFrame 的产品槽位、筛选草稿、Saved View 与 optimistic domain state |
| BEM、data state、theme token、scrollbar utilities | StoneFlow semantic theme 值、产品布局和少量必要 recipe |

判断规则：一个自研组件如果只是重复标准行为，应删除或降为薄的产品组合；如果它承担领域投影、跨组件编排或平台几何，即使 HeroUI 有同名组件也不能替换。

## 5. 候选矩阵：立即可用 / 条件可用 / 拒绝

### 5.1 立即可用

| 优先级 | 当前实现 | HeroUI 能力 | 收益 | 风险 | 结论 |
|---|---|---|---|---|---|
| P0 | `OverlayScrollbar.tsx` 266 LOC + 全局隐藏原生 scrollbar | OSS Styles `scrollbar` / `scrollbar-thin` | 删除自研几何、pointer drag、Resize/MutationObserver/rAF 状态机；回归浏览器原生滚动语义 | 跨 WebView 视觉与命中区需要真机验收 | 立即开独立 hard-cut ticket |
| P0 | 同步间隔 `Input type="number"` + string draft + clamp | OSS `NumberField` | 正确数值 value、步进、min/max、校验和 i18n 语义 | blur/Enter 的持久化契约需保留 | 立即可用 |
| P0 | Space 颜色用 `Select` + 手写圆点 | OSS `ColorSwatchPicker` | 有限色板的视觉/键盘语义更准确，减少重复 swatch markup | HeroUI value 是颜色，领域值是 `colorKey`，必须显式适配 | 立即可用 |
| P1 | `SettingCheckboxRow` 自组 OSS Switch 行 | Pro `CellSwitch` | 整行可点、label/control recipe、disabled/selected 状态由上游接管 | Pro beta、视觉可能偏离重构前目标 | 当前版可用，先单屏视觉验收 |
| P1 | 两个 `Input type="date"` | OSS `DatePicker` / `Calendar` | 键盘、popover、locale 和日期段语义更完整 | ISO string ↔ `DateValue` adapter；可能新增直接依赖 | 只替 custom date 分支 |
| P1 | PageFrame 内 Toggle group + filter/display actions | OSS `Toolbar` | 混合控件统一方向键导航和 toolbar landmark | 嵌套 ToggleButtonGroup 的按键契约要验收 | 当前版可原型 |
| P2 | 设置页默认 Space 的宽 Select | Pro `CellSelect` | 设置 cell 的 label/value/indicator recipe | 当前已经是 HeroUI Select，行为收益有限；Pro beta | 仅当目标视觉就是紧凑 settings cell 时使用 |

### 5.2 需要上游能力或架构契约后才可用

| 候选 | 当前阻塞 | 何时再评估 |
|---|---|---|
| `Breadcrumbs.Item` 直接替换当前 TanStack Router item | 官方当前文档只证明 `href` 与 DOM `render`；官方 Router 示例针对 `Link`，推荐把 HeroUI variant/BEM class 应用到框架 Link，没有证明 `Breadcrumbs.Item render` 是 TanStack Link adapter | 上游提供明确的 Breadcrumb router integration，或项目单独批准并验证 React Aria app-level router adapter 后；可能伴随 HeroUI 升级 |
| Launcher 结果迁到 Pro `Command` | 不是版本缺失：beta.8 已支持 Autocomplete + Menu 虚拟焦点；真正阻塞是 Launcher 冻结架构、Tauri 固定壳、Create 独立 focus lane 和 selection feature 所有权 | 单独 ADR + throwaway prototype 证明 official anatomy 不破坏窗口几何、IME、Create lane、异步 search 和 session 后 |

当前 P0 候选没有“必须先升级 HeroUI”这一依赖。不要为了寻找新组件先升级；若上游后续改变 beta API，应由单独依赖升级工作包处理。

### 5.3 拒绝替换

| StoneFlow 组件/交互 | 看似对应的 HeroUI 组件 | 拒绝原因 |
|---|---|---|
| `TaskBoard` | Pro ListView / DataGrid / Kanban | TaskBoard 有 TanStack virtualizer、自定义 `rangeExtractor`、sticky 分区、分页 placeholder extent、RAC virtualized grid、跨分区 selection、Command shortcut 与 focus bridge；通用 collection 无法保持这些合同 |
| Launcher 结果 | Pro ListView | ListView 基于 RAC GridList，适合 collection focus/selection；它不是输入框关联的 autocomplete，不能把 active item 通过 `aria-activedescendant` 留在输入框上 |
| Launcher 整壳 | Pro Command / AppLayout | Command 官方 anatomy 自带 Backdrop/Container/Dialog 几何；AppLayout 也不拥有 Tauri 720×500 原生窗、圆角和 present session |
| `TaskPreview` | Pro HoverCard | 预览是绝对定位、可由键盘/命令打开、与虚拟行和异步 task detail 绑定，不是 trigger hover/focus 卡片 |
| `MetadataFieldDropdown` | Pro InlineSelect / CellSelect | 它含数字快捷键、Command shortcut、drawer-owned overlay、clear-only 模式和产品选项投影；保留产品组合，继续让 HeroUI Dropdown 接管标准 menu 行为 |
| `FilterBar` clause | OSS TagGroup | clause 内嵌 field/operator/value dropdown 与 remove，是筛选公式语法，不是平坦可删除 tag collection |
| Shell | Pro AppLayout / Sidebar.Pages | Shell 已使用 Pro Sidebar/Sheet/Resizable，但 URL、history、autosave、Tauri geometry 和 overlay contracts 属于 StoneFlow；不要整体换壳 |
| `settingsShared` 整体 | Pro CellSelect/CellSwitch | Pro 只提供具体 field row，没有 SettingsSection、诊断信息卡或业务分组容器；只能局部替换标准控件 |
| 同步分钟 | Pro NumberStepper | OSS NumberField 已满足需求；NumberStepper 引入 `@number-flow/react` peer，仅增加数字动效，复杂度收益不匹配 |

## 6. 高收益候选详解

### 6.1 P0-A：删掉 OverlayScrollbar，但保留 AppScrollArea

当前实现：

- `src/shared/components/OverlayScrollbar.tsx`：266 行，自管 thumb 几何、可见性、pointer drag、rAF、ResizeObserver、MutationObserver。
- `src/shared/components/AppScrollArea.tsx:13-18`：通过 context 暴露真实 viewport ref。
- `src/shared/components/AppScrollArea.tsx:37-44`：真实 `overflow-y-auto` viewport 与自研 overlay 同时存在。
- `src/styles/base.css:74-80`：全局把 `[data-scroll-container="true"]` 的原生 scrollbar 隐藏。
- `src/styles/theme.css:101-106`：已经定义 HeroUI 使用的 `--scrollbar-*` tokens。
- `src/features/task/components/TaskBoard.tsx:163,282-296`：virtualizer 直接依赖 viewport ref。

当前安装的 `@heroui/styles@3.2.4` 已确认存在四个官方 utility：

| Utility | 当前安装版效果 |
|---|---|
| `scrollbar` | 读取 `--scrollbar-width/color/gutter` |
| `scrollbar-thin` | HeroUI themed thin scrollbar |
| `scrollbar-default` | OS/browser 默认 scrollbar |
| `scrollbar-none` | 隐藏 scrollbar |

官方文档同样列出这四个名字：[HeroUI Styling · Scrollbars](https://heroui.com/en/docs/react/getting-started/styling#scrollbars)。安装包还支持祖先上的 `data-scrollbar="thin|default|none"` 改变变量模式，但具体 overflow slot 仍应应用 scrollbar utility。

推荐 hard cut：

1. 保留 `AppScrollArea`、viewport context、`data-scroll-container` 和 TaskBoard 的 `getScrollElement`。
2. 在真实 scroll viewport 上应用 `scrollbar`（默认推荐）或 `scrollbar-thin`。
3. 删除 `<OverlayScrollbar />`、它的测试和文件。
4. 删除或收窄 `base.css` 中强制隐藏原生 scrollbar 的规则，不能一边加 `scrollbar` 一边被旧规则覆盖。
5. 不修改 virtualizer 的 `rangeExtractor`、scroll extent 或 sticky 算法。

收益是确定的：至少删除 `OverlayScrollbar.tsx` 的 266 行。净删除量要等测试/CSS patch 后再统计，不应提前虚报。可访问性收益是合理推断：回到浏览器原生滚动条后，不再只有 `aria-hidden` 的 pointer thumb；但仍需真实读屏/键盘验收后才能宣称通过。

验收门：

- macOS 与 Windows：滚轮、触控板、拖 thumb、PageUp/PageDown、Home/End。
- 长列表：sticky header 顶替、分页 placeholder、滚动位置不跳。
- 内容由短变长/长变短：scrollbar 可见性与尺寸稳定。
- 浅色/深色与 accent 主题：thumb/track 对比符合预期。

### 6.2 P0-B：同步间隔使用 NumberField

当前 `SettingsSyncPanel.tsx:445-474` 使用 `Input type="number"`，并在 `onChange` 中维护字符串 draft，在 blur/Enter 调用 `handleIntervalMinutesCommit`；`240-277` 仍负责 Tauri 保存和服务端回写。

OSS NumberField 的官方 compound API 是：

```tsx
<NumberField value={minutes} minValue={min} maxValue={max} step={1} onChange={setMinutes}>
  <Label>同步间隔（分钟）</Label>
  <NumberField.Group>
    <NumberField.DecrementButton />
    <NumberField.Input />
    <NumberField.IncrementButton />
  </NumberField.Group>
</NumberField>
```

准确 anatomy/props 以 [HeroUI NumberField](https://heroui.com/en/docs/react/components/number-field) 为准，实施时不得照本文片段猜未列出的 slot 名。

所有权划分：

- HeroUI：数字解析、步进按钮、min/max、field validation、键盘和 locale。
- StoneFlow：何时落库、Tauri error、pending/disabled、保存成功后 canonical value 回写。

不要把每次 `onChange` 都直接变成 Tauri mutation；仍需确定 commit policy（blur、Enter 或显式 debounce）。长期建议把 UI draft 改成 `number | null`，避免继续维护第二份 string→number parsing。

### 6.3 P0-C：Space 有限色板使用 ColorSwatchPicker

当前 `SpaceEditorDialog.tsx:207-249` 用 Select/ListBox 渲染五个颜色圆点；颜色定义在 `spaceVisuals.ts:61-104`，领域表单保存 `colorKey`。

OSS ColorSwatchPicker 支持：

- 单选预定义色板；
- grid/stack、circle/square、size；
- controlled `value`/`onChange`；
- Item/Swatch/Indicator compound slots。

官方文档：[HeroUI ColorSwatchPicker](https://heroui.com/en/docs/react/components/color-swatch-picker)。

实施边界：

- 给 `SPACE_COLOR_OPTIONS` 增加一个稳定的 CSS color value，并建立显式 `colorKey ↔ color value` adapter。
- HeroUI Color 对象只存在于 view adapter；表单 schema、数据库和 domain 继续保存 `blue|green|amber|rose|slate` 等 key。
- 每个 swatch 仍需可访问名称，不能只显示颜色。
- 不换成自由取色 `ColorPicker`；产品目前是有限 palette，扩大领域能力属于新需求。

### 6.4 P1：设置页 CellSwitch / CellSelect

本次同时用官方文档、安装包导出表和一次实际 ESM import 核实：beta.8 根入口真实导出 `CellSwitch` 与 `CellSelect`，不需要猜子路径。

`SettingCheckboxRow` 当前已经使用 OSS `Switch`，所以迁移到 Pro `CellSwitch` 的收益不是“从无障碍控件变成有障碍控件”，而是删除 StoneFlow 重复维护的 setting-cell recipe。推荐：

- 保留一个有产品语义的薄组件，例如 `SettingsToggleRow`，只接受 label/description/checked/disabled/onChange。
- 内部直接组合 `CellSwitch.Trigger/Label/Control`，不再复制 Switch focus/selected/disabled CSS。
- 若六个调用点直接展开会造成重复，不能为了“去 wrapper”反而违反 DRY。
- `SettingsSection`、`SettingsPreferenceGroup`、`SettingInfoRow` 继续保留：它们是分区、诊断和内容 IA，不是开关 primitive。

官方依据：[CellSwitch](https://heroui.pro/docs/react/components/cell-switch)、[CellSelect](https://heroui.pro/docs/react/components/cell-select)。

`CellSelect` 对 `SettingsGeneralPanel.tsx:90-117` 的默认 Space 有视觉适配价值，但当前已经使用 HeroUI Select，标准行为并没有自研。因此它是“目标视觉为紧凑 settings cell 时采用”的 P2，而不是代码清理 P0。

### 6.5 P1：自定义日期入口使用 DatePicker

仅有两个生产入口仍使用 `type="date"`：

- `src/features/launcher/composer/controls/DateControl.tsx:62-72`
- `src/features/metadata-fields/components/CustomDateDialog.tsx:75-85`

OSS DatePicker 是 `DatePicker + DateField + Calendar` compound，controlled value 是 `DateValue | null`。官方示例使用 `@internationalized/date` 的 `parseDate`、`today` 等能力：[HeroUI DatePicker](https://heroui.com/en/docs/react/components/date-picker)。

建议：

- “今天/明天/本周/清除”、Command shortcuts 和 drawer-owned overlay 继续保留。
- 只用 DatePicker 替换自定义日期选择器。
- 写一个靠近日期 view 的 ISO date adapter；不要把 `DateValue` 泄漏进 domain。
- 当前 `@internationalized/date` 只出现在 lockfile 的传递依赖中。若业务源码直接 import，必须在实施 ticket 中把它声明为直接 dependency，不能依赖 hoist/transitive 偶然性。

### 6.6 P1：PageFrame Toolbar

`PageFrame.tsx:100-145` 已使用 `ToggleButtonGroup` 管理单选 pills；Filter 和 Display actions 是相邻的独立控件。OSS `Toolbar` 能为一组混合交互控件提供 toolbar landmark 与方向键导航，并允许包含 ButtonGroup/ToggleButtonGroup：[HeroUI Toolbar](https://heroui.com/en/docs/react/components/toolbar)。

这不是必做替换。只有在键盘验收证明当前 Tab 序列/方向键体验确有偏差时，才应增加 Toolbar。不能为了组件覆盖率新增一层无收益容器。

## 7. 五个需要特别澄清的 API 边界

### 7.1 ToggleButtonGroup 多选：当前版已支持，立即可用

官方 `ToggleButtonGroup` 支持：

- `selectionMode="single" | "multiple"`；
- controlled `selectedKeys: Iterable<Key>`；
- `onSelectionChange(keys: Set<Key>)`；
- `disallowEmptySelection`；
- 每个 ToggleButton 必须有唯一 `id`。

来源：[HeroUI ToggleButtonGroup](https://heroui.com/en/docs/react/components/toggle-button-group)。仓库 `ViewEditorDialog.tsx:181-195` 已在实际使用 multiple mode，`PageFrame.tsx:120-144` 使用 single mode。无需升级，也不应再造一套 boolean prop group。

### 7.2 Breadcrumbs.Item + TanStack Router：当前不要强行收口

官方 Breadcrumbs API 确认 `Item` 有 `href` 和 DOM `render`；但官方源码显示 Item 内部同时组合 RAC `Breadcrumb` 与 HeroUI `Link`，并把 props 传给两层。官方 router 指南出现在 Link 文档中，推荐把 `linkVariants` 或 BEM class 应用到框架专用 Link，而不是声明 `Breadcrumbs.Item render` 是 router adapter。

来源：[Breadcrumbs 文档](https://heroui.com/en/docs/react/components/breadcrumbs)、[Breadcrumbs 官方源码](https://github.com/heroui-inc/heroui/blob/v3/packages/react/src/components/breadcrumbs/breadcrumbs.tsx)、[Link · Using with Routing Libraries](https://heroui.com/en/docs/react/components/link#using-with-routing-libraries)。

当前 `AppBreadcrumb.tsx:27-95` 使用 HeroUI Breadcrumbs root、RAC Breadcrumb item、TanStack Link 与 HeroUI BEM class。它避免 `href` 触发 hash-router 外的原生导航，并保留类型化 router 行为。结论：保留；等上游提供明确集成或单独批准 app-level router adapter 后再收口。

### 7.3 Launcher：ListView 不合适；Command 技术上合适但架构上未获准

当前 Launcher：

- `TitleInput.tsx:27-58` 的 Input 自己处理 IME 和 keydown。
- `LauncherResults.tsx:34-72` 是手写 `role="list"`。
- `LauncherDomainProvider.tsx:45-80` 与 `useLauncherDraftActions.ts:96-133` 维护 selection feature state，并把真实 DOM focus 移到 result Button。
- `ARCHITECTURE.md:58-65,69-83` 冻结了 720×500 Tauri 壳、Create 独立 focus lane、结果 collection 所有权。

Pro ListView 基于 RAC GridList，提供 collection focus/selection/virtualization；它没有与外部 Input 绑定的 Autocomplete。若直接替换，输入不会自然保留 DOM focus，因此**拒绝**。

Pro Command 的官方 API 则明确：`Command.Dialog` 内部包 Autocomplete，`Command.List` 基于 RAC Menu；当前安装实现会在桌面虚拟焦点模式下把 active item id 写入 Input 的 `aria-activedescendant`，并把键盘导航留在输入框。这正是 Launcher 输入不中断的理想标准行为。[HeroUI Pro Command](https://heroui.pro/docs/react/components/command)

但不能因此立即换：官方 anatomy 自带 Backdrop/Container/Dialog，Container 有自身全屏/15vh 几何；StoneFlow Launcher 是独立 Tauri window、固定 Surface、Create lane 不在 flatItems，且文档明确 collection state 属于 selection feature。结论是**当前版可做 throwaway prototype，不是当前可实施替换，也不是简单升级可解决的问题**。

原型必须同时证明：

- 中文 IME composition 不被 Arrow/Enter 打断；
- 输入框保持 focus，active descendant 正确更新和朗读；
- Create lane 与 results 的 ↑↓ 顺序不变；
- server-filtered 异步结果不会被 Command 默认 filter 再过滤；
- 不引入第二份 selected/focused state；
- Tauri 固定窗、ScrollShadow、Footer、session present/close 几何不变。

### 7.4 Scrollbar utilities：当前安装版精确名称已确认

`@heroui/styles@3.2.4` 的精确 class 名是：

```txt
scrollbar
scrollbar-thin
scrollbar-default
scrollbar-none
```

不是 `scroll-area`、`scrollbar-auto` 或任何猜测名称。全局模式是祖先上的 `data-scrollbar="thin|default|none"`；overflow slot 本身仍需使用对应 utility。

### 7.5 Pro Settings 类组件：只导出 Cell*，没有 Settings 容器

当前 beta.8 已真实导出：

- `CellSelect`
- `CellSwitch`
- `CellSlider`
- `CellColorPicker`

以及其他 forms 组件，但官方实时清单和安装包都没有名为 `Settings`、`SettingsSection` 或 `SettingsGroup` 的 Pro 组件。

结论：

- `SettingCheckboxRow` → CellSwitch：值得，P1。
- 默认 Space Select → CellSelect：可选，P2，主要是视觉 recipe 收口。
- `SettingsSection`、`SettingInfoRow`、诊断/错误/Disclosure → 不替换。
- 不因为 Cell* 存在就把所有设置项压成 252px 紧凑 cell；StoneFlow 桌面设置页的信息密度与重构前 UI 才是决定因素。

## 8. v3 实施规则与依赖风险

### 8.1 Compound API 与事件

- 使用文档给出的 compound anatomy，例如 `Modal.Header/Body/Footer`、`Select.Trigger/Popover`、`NumberField.Group/Input`；不要从旧 shadcn/Radix 心智猜 slot。
- 对 Button、Toggle、Menu item 等 pressable 使用 `onPress`，不要回退为 `onClick`。`onPress` 统一 mouse、touch、keyboard 与 assistive activation。[HeroUI Button](https://heroui.com/en/docs/react/components/button)
- 对原生输入值仍使用该组件规定的 `onChange`/`onSelectionChange`。不要把“统一 onPress”错误扩展到文本/数值字段。
- 领域 state 使用 controlled mode，HeroUI 不应成为第二事实源。
- 不添加 HeroUI Provider；v3 不需要。

### 8.2 Import 与 bundle

- OSS `@heroui/react` 安装包标记 `sideEffects: false`，根入口 named imports 可由 Vite tree-shake。不要无指标地把全部 OSS import 改成 subpath。
- Pro 根 barrel 有意不导出部分 peer-heavy 组件；需要 map、charts、rich text、markdown、carousel、number animation、resizable 等能力时，必须按该组件官方文档使用精确 subpath。
- 当前 `EntityDetailDrawerHost.tsx` 使用 `@heroui-pro/react/resizable`，符合 beta.8 的 subpath 规则。
- 若采用某个 peer-heavy Pro 组件，应把它所需 peer 声明为项目直接依赖并跑 bundle report，不能依赖 Bun 自动安装 peer 或 lockfile 里的传递依赖。
- 保留样式顺序：Tailwind → OSS styles → Pro CSS → StoneFlow theme/components/base。

官方依据：[HeroUI Pro Installation](https://heroui.pro/docs/react/getting-started/installation)、[HeroUI Pro beta.8 release](https://heroui.pro/docs/react/releases/beta-8)。

### 8.3 Beta 与 Pro 许可

- 当前 Pro 是精确锁定的 `1.0.0-beta.8`，不是 stable。beta.8 官方 release 本身包含 subpath、peer 与 Sidebar API 的 breaking changes，因此每次升级必须独立审阅 release notes，并对 overlay、focus、keyboard、Sidebar、Command 做 focused regression。
- 优先用 OSS 组件满足标准需求；只有 OSS 缺少明确组合 recipe 时才使用 Pro。
- Pro 包 metadata 不是 MIT，而是 `SEE LICENSE IN LICENSE`。继续使用需要遵守现有 HeroUI Pro 许可、token 与 CI secret 管理要求。[HeroUI Pro Licensing](https://heroui.pro/docs/react/getting-started/licensing)
- 不因已有 Pro license 就追求“组件使用率”；每个 Pro 组件仍要证明比 OSS 组合更低的长期成本。

## 9. 建议拆票顺序

每个项目都应是独立本地 work package；不要把滚动、设置、日期和 Launcher 混成一个大改。

### Ticket A：原生 HeroUI scrollbar hard cut

- 删除 `OverlayScrollbar`。
- 保留 AppScrollArea viewport contract。
- focused tests + macOS/Windows Tauri smoke + TaskBoard 长列表验收。

### Ticket B：OSS NumberField

- 只改同步间隔。
- 明确 blur/Enter/save canonical value 的单一状态机。
- 单元测试 min/max、空值、失败回滚、disabled/pending。

### Ticket C：OSS ColorSwatchPicker

- 只改 Space 固定色板。
- 显式 key/color adapter，不迁移数据库。
- 键盘、读屏名称、create/edit default 与视觉对比。

### Ticket D：Pro CellSwitch setting row

- 只改 Sidebar settings 的六个 toggle rows。
- 先保留薄的产品语义组件，删除内部重复 Switch recipe。
- 对比重构前截图；若 Pro recipe 不合目标 UI，宁可保留 OSS Switch，不做兼容 CSS 壳。

### Ticket E：DatePicker custom branch

- Launcher 与 metadata custom date 可分两票。
- 先建立 ISO adapter 和 dependency 边界，再换 UI。

### Ticket F：Launcher Command 原型（非生产 ticket）

- 仅验证 active descendant、IME、Create lane、server results 与 Tauri geometry。
- 原型结论进入 ADR；未通过就删除原型，不留下兼容 facade。

## 10. 官方来源

- [HeroUI OSS Components](https://heroui.com/en/docs/react/components)
- [HeroUI Pro Components](https://heroui.pro/docs/react/components)
- [HeroUI OSS Quick Start](https://heroui.com/en/docs/react/getting-started/quick-start)
- [HeroUI Composition](https://heroui.com/en/docs/react/getting-started/composition)
- [HeroUI Styling / Scrollbars](https://heroui.com/en/docs/react/getting-started/styling#scrollbars)
- [HeroUI Pro Installation](https://heroui.pro/docs/react/getting-started/installation)
- [HeroUI Pro Licensing](https://heroui.pro/docs/react/getting-started/licensing)
- [HeroUI Pro beta.8](https://heroui.pro/docs/react/releases/beta-8)
- [Button](https://heroui.com/en/docs/react/components/button)
- [NumberField](https://heroui.com/en/docs/react/components/number-field)
- [ColorSwatchPicker](https://heroui.com/en/docs/react/components/color-swatch-picker)
- [DatePicker](https://heroui.com/en/docs/react/components/date-picker)
- [ToggleButtonGroup](https://heroui.com/en/docs/react/components/toggle-button-group)
- [Toolbar](https://heroui.com/en/docs/react/components/toolbar)
- [Breadcrumbs](https://heroui.com/en/docs/react/components/breadcrumbs)
- [Breadcrumbs official source](https://github.com/heroui-inc/heroui/blob/v3/packages/react/src/components/breadcrumbs/breadcrumbs.tsx)
- [Link / routing libraries](https://heroui.com/en/docs/react/components/link#using-with-routing-libraries)
- [Pro CellSwitch](https://heroui.pro/docs/react/components/cell-switch)
- [Pro CellSelect](https://heroui.pro/docs/react/components/cell-select)
- [Pro Command](https://heroui.pro/docs/react/components/command)
- [Pro ListView](https://heroui.pro/docs/react/components/list-view)
- [Pro DataGrid](https://heroui.pro/docs/react/components/data-grid)
- [Pro Kanban](https://heroui.pro/docs/react/components/kanban)
- [Pro HoverCard](https://heroui.pro/docs/react/components/hover-card)

## 11. 最终推荐

长期最优不是扩大 HeroUI 包裹层，而是让上游组件真正拥有标准行为，同时让 StoneFlow 的模块只保留不可外包的产品语义。

本轮最值得执行的组合是：

```txt
删除 OverlayScrollbar
+ NumberField
+ ColorSwatchPicker
+ 有限采用 CellSwitch
+ custom-date DatePicker
--------------------------------
保留 TaskBoard / selection / Command registry / Tauri geometry / product compositions
```

这条路线删除的是真正重复的基础设施，不会为了“HeroUI 覆盖率”牺牲已验证的产品模型，也不需要维护 shadcn 时代的兼容层。
