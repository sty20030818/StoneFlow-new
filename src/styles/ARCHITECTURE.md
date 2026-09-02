# StoneFlow 视觉样式架构

> 版本：v4
> 最后更新：2026-09-02
> 作用：定义 `src/styles` 的现行合同。

## 1. 一句话心智

页面直接使用 HeroUI；HeroUI 上游 recipe 负责组件结构与完整交互状态，`theme.css` 统一语义值，`components.css` 只保存跨应用必需差异，产品 Module 拥有结构、业务语义和动态几何。

```txt
Tailwind + HeroUI OSS/Pro
          ↓
theme.css：全局语义值
          ↓
components.css：最小公共差异 recipe
          ↓
产品 Module：布局、组合、动态几何与业务行为
```

不存在第二套 StoneFlow Button、页面私有主题或 class-string pattern。

## 2. 外部 Interface

Main 与 Launcher 各自只导入一次 `styles/index.css`。Feature 不直接导入 `theme.css`、`components.css`、HeroUI CSS 或任何旧 token 文件。

普通调用方直接使用 HeroUI Interface：

```tsx
<Button size='sm' variant='primary'>
	保存
</Button>
```

调用方不需要知道 Button 的颜色、圆角、边框、Hover、Pressed、Focus 或 Disabled 实现。全局换肤不要求修改页面 JSX。

Appearance 是独立 Module：`features/appearance` 只负责 Accent 标识、合法值校验、本机持久化和根属性，不拥有颜色值或组件 recipe。

## 3. 文件结构

```txt
src/styles/
├── ARCHITECTURE.md
├── index.css       # 唯一导入入口
├── fonts.css       # 只声明 @font-face 字体资产
├── theme.css       # 唯一全局语义值源
├── components.css  # 唯一且最小的公共组件差异 recipe
└── base.css        # 文档、选择、原生窗口与浏览器基础行为
```

浏览器拥有滚动行为与原生 scrollbar；真实 viewport 直接使用 HeroUI Styles 的 `scrollbar` utility。`base.css` 不隐藏或重绘全局 scrollbar，只有产品明确批准的极窄区域可以在调用方显式隐藏。

import 顺序固定为：

```txt
tailwindcss
→ @heroui/styles
→ @heroui-pro/react/css
→ fonts.css
→ theme.css
→ components.css
→ base.css
```

## 4. `theme.css` · 全局语义值唯一 Owner

`theme.css` 负责：

- 单一冷灰 Light 主题；
- 六组 Accent 及其实际消费角色；
- 固定 Success、Warning、Danger、Info，并区分实心填充与 Surface 上的文字、图标、状态圆点；
- Background、Surface、Field、Border、Separator、Focus、Backdrop、Shadow；
- 字体族语义映射、禁用透明度、控件高度与语义圆角；
- HeroUI 和必要 Tailwind 语义变量映射。

全局几何固定为：

```css
--radius-control: 6px;
--radius-surface: 8px;
--radius-overlay: 12px;
--radius-pill: 9999px;

--control-height-sm: 28px;
--control-height-md: 32px;
--control-height-lg: 36px;

--border-width: 1px;
```

规则：

- Input、Menu 与其他普通 Control 使用 `6px`；Button 与 Toggle 使用 pill；Card 与 Row 分组使用 `8px`；Popover、Modal 与 Sheet 使用 `12px`。
- pill 用于 Button、Toggle、Chip、Avatar、ActionBar 和状态标记；导航行本身不使用 pill。
- 附着式 ButtonGroup 与 ToggleButtonGroup 的首、中、尾几何继续由 HeroUI 上游负责。
- 有明确边界的 Surface 使用 `1px` 语义边框；Row 使用分隔线与状态背景；阴影只表达浮层或拖拽 elevation。
- 不创建无消费者色阶、任意主题配置、Dark 脚手架或 TypeScript token 镜像。
- 只有需要生成 JSX utility 的语义才进入 `@theme inline`；recipe 私有值保持普通 CSS variable。

## 5. `components.css` · 公共差异唯一 Owner

HeroUI OSS/Pro 的锁定版本是默认实现，负责组件结构、Hover、Pressed、Selected、Open、Focus-visible、Disabled、Pending、Invalid、Danger、动画及 `prefers-reduced-motion`。`components.css` 不复制上游状态机，只通过公开 BEM 与稳定共享 DOM hook 保存 StoneFlow 确实需要的跨应用差异：

- `NumberField`、`ColorSwatchPicker`、`CellSwitch`、`CellSelect`、`Calendar`、`Toolbar` 与 `ActionBar` 直接使用上游结构和状态 recipe；其中 NumberField 与 CellSwitch 只共享已批准的无硬框字段外壳，Calendar 只恢复日期单元的真圆语义，ColorSwatchPicker 只恢复 circle variant 的真圆语义，ActionBar 只恢复固定操作 pill 的真圆语义；

- 28/32/36px 工作台控件密度和紧凑集合行；
- 次级选择的中性表面，避免 Accent 大面积铺色；
- Card 与 Overlay 的统一轻边界；Surface 保持 HeroUI 上游的无边界语义；
- `RowShell` 的 selected/current/focus-suppressed/context-menu-open 等稳定共享状态；普通 hover、current、selected 与 selected + hover 分别使用固定的 `surface-hover`、`surface-active`、`selection` 与 `selection-hover`，不随 Accent 预设漂移；键盘焦点恢复期间不得让 stale pointer hover 抢回 current 视觉。
- `Input`、`Textarea`、`SearchField`、`NumberField`、`InputGroup`、`Select`、`Autocomplete` 与 `CellSwitch` 的外壳移除硬边框；primary 使用 HeroUI Light 轻阴影，secondary 保持无阴影填充面，focus / invalid 继续由上游 ring 与 outline 表达。
- `Alert` 使用 1px 轻边界而非卡片阴影；accent、success、warning 与 danger 状态统一使用对应 soft surface 与同色边界，其中 Alert accent 固定表达 Info，不随用户 Accent 预设漂移。
- 标题、代码和数字输入只通过稳定语义 hook 统一内容层级，不向 Feature 暴露可配置皮肤。
- 原生 host 合同只保留内容高度、Windows 窗体命中区、拖拽期间关闭 Sidebar transition、compact 导航 Sheet 的系统按钮避让、路由回退链接及 Launcher 嵌入提示所需的窄 recipe。
- `GlobalSearchResults` 与 Launcher 原生窗 Surface 是两个窄表面例外：上游无对应边界 recipe，稳定 hook 只补齐各自缺失的边界、圆角或阴影，不扩张为通用 Surface 皮肤。

它不负责：

- 业务状态和领域分支；
- 页面宽度、Grid 列数或响应式排列；
- Sidebar 动态宽度、TaskBoard 虚拟测量、sticky 和分页；
- Sheet placement、Resizable 尺寸或 Launcher 原生窗几何。

新增公共视觉时先证明 HeroUI token 与上游 recipe 无法表达，再增加最小覆盖。跨 Feature 的稳定共享合同无法由 HeroUI 表达时，可以输出语义 DOM hook；产品或 host 表面只有在上游完全无对应 recipe、且 hook 仍由唯一 Module 独占时才允许窄覆盖。产品几何仍留在共享组件或 Feature，禁止公开通用 `tone`、`radius`、`surface` 数据属性重新制造 patterns。

## 6. 产品 Module 与 `className`

普通产品 wrapper 与内容子节点可以通过 `className` 表达 flex/grid、gap、内容排版、响应式结构和 Feature 特有几何。

HeroUI 原子控件、集合 Item 与 Overlay chrome slot 只允许：

- 外部 width、min/max、margin、position、order、grow/shrink；
- overflow、scroll、truncate 与 portal placement；
- Sidebar、Resizable、Sheet、Launcher 等运行时动态几何和 CSS variable。

这些公共视觉 owner 不得通过局部 `className` 重写：

- 控件内部 display、gap、padding、字体、行高或图标尺寸；
- 通用颜色、背景与文字语气；
- 边框颜色、圆角、阴影和 ring；
- Hover、Pressed、Selected、Open、Focus、Disabled 或 Invalid 皮肤；
- Accent 分支或 HeroUI BEM class。

Form、RadioGroup、Toolbar、Surface、Resizable、ScrollShadow 与 Trigger 等结构组件可直接承载所属产品 Module 的 flex/grid、响应式结构和动态几何；它们仍不得重写公共颜色、边框、圆角、阴影或交互皮肤。若 Surface 本身承担产品布局，该结构由唯一产品 Module 固定，不把皮肤自由度重新暴露给调用方。

合法特殊形状必须属于真实产品语义，例如 Avatar 圆形、Launcher 原生窗裁切或嵌入式 Sheet 无外侧圆角；它们写在所属产品 Module 的 Implementation 中，不复制到调用方。

## 7. 共享 Module 深度

跨 Feature 共享必须通过 deletion test：删除后，复杂行为或产品合同会重新扩散到多个调用方，才值得保留。

- `PageFrame` 统一页头、工具栏、普通 `Body` 与集合 `CollectionBody`；`CollectionBody` 通过 `AppScrollArea` 提供唯一真实 viewport，页级图标操作由真实页面直接组合 HeroUI Button 与 `ActionTooltip`。
- `PageFrame.Toolbar` 直接组合 HeroUI `Toolbar`，只保留产品槽位、外部布局与 FilterBar 的区域顺序，不重写工具条焦点模型。
- `RowShell` 只统一可访问交互根与 active / selected / hover / focus / pending 状态；`RowLayout` 统一 `selection`、`leading`、`primary`、`properties`、`actions` 五槽排版，并在 selection / actions 槽隔离 Row activation 事件。
- `BoardRowSlot` 是 section 内连续选择形状与 `44px + 2px` Row 占位的唯一 Owner；`BoardSectionHeader` 只统一 `36px` Header anatomy。邻接计算、sticky/absolute positioning、折叠、Context Menu 与领域动作归各 Board。
- `shared/components/collectionGeometry.ts` 是 Row `44px`、Header `36px`、item gap `2px` 的唯一产品几何事实源；`components.css` 只渲染 `RowShell` 状态皮肤与 `BoardRowSlot` 暴露的连续选择状态，不复制数值或邻接算法。
- Task Detail 只有一个生产 owner，其 Header/Footer/PageLayout/Section/SaveStatus 与滚动结构均由 task feature 持有。
- `AppScrollArea` 只封装真实 viewport 与 ref context；滚动由浏览器执行，外观直接复用 HeroUI Styles 的 `scrollbar` utility。
- `ActionTooltip` 隐藏 React Aria trigger props/ref 合并与快捷键展示行为。
- `SettingsToggleRow` 是 settings 内八个真实消费者共享的产品组合，直接使用 Pro `CellSwitch`；默认 Space 的 Pro `CellSelect` 只有一个消费者，保持内联组合。

禁止：

- `shared/components/patterns`；
- 平行 `shared/components/base`；
- 一对一 HeroUI wrapper；
- 只导出 class 字符串的 `*Tokens.ts`；
- 只转发另一个 Module 的目录或 barrel；
- 为唯一实现创建 port 或 Adapter。

## 8. Cold Start Adapter

Main HTML、Launcher HTML 与 Tauri 原生窗口在 React/CSS 接管前必须避免闪色。这些是不同 host 的真实 Adapter，允许保留最小中性值重复，但必须由静态同步检查保证与 `theme.css` 一致。

Cold start 只包含中性结构，不复制六组 Accent recipe；两个 renderer 均在 React 挂载前调用 `bootstrapAppearance()`。

## 9. 新样式落点

按以下顺序判断：

1. 是全应用视觉值：修改 `theme.css`。
2. 是 HeroUI 默认无法表达的跨应用公共差异：修改 `components.css`。
3. 是全局文档或原生窗口基础行为：修改 `base.css`。
4. 是跨 Feature 的真实行为或产品合同：修改对应共享 Module。
5. 是 Feature 特有布局、动态几何或内容层级：留在所属 Feature。
6. 以上都不是：不新增样式。

## 10. 架构不变式与验证

以下情况视为回退：

1. 页面重新拥有通用控件皮肤。
2. 同一视觉值在多套 token 中存在。
3. `patterns`、旧 `base`、shadcn adapter 或兼容 alias 回流。
4. 新建视觉 wrapper、CVA 镜像、design-system package 或 Provider。
5. HeroUI root、compound part 或 slot 使用 `rounded-*`、颜色型 `bg/text/border-*`、`shadow-*`、`ring-*`、内部 metrics 或交互状态 utility 绕过上游 recipe 与最小公共差异。
6. 产品动态几何被错误塞入全局主题。
7. renderer import 顺序或 cold-start 中性值漂移。

门禁负责检查导入顺序、旧轨道零消费者、视觉 utility 越界、主题与 cold-start 同步、类型、Lint、模块依赖、格式、第一方动效和生产构建。jsdom 与 className 快照不构成视觉验收；真实 Main/Launcher 状态矩阵必须单独走查。
