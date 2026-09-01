# HeroUI OSS 原子与表单人工审查研究

> 日期：2026-08-31
> 状态：第九批结论已确认；部分目标已在后续明确反馈中实施，等待工作包统一收口
> 锁定版本：`@heroui/react@3.2.4`、`@heroui/styles@3.2.4`
> 范围：UI Lab 第 9 组 9 个 review unit、对照 fixture 真实性修复与审查记录；不修改生产组件、样式、依赖或锁文件

## 1. 结论先行

这 9 条反馈不是 9 个独立的组件问题，实际收敛为三类原因：

1. **字段硬框来自共享 field token，但不能全局归零。** Text Fields、SearchField、NumberField、Select、ComboBox、Autocomplete 都消费 `--border-width-field` / `--field-shadow`；Radio、Date/InputGroup、OTP 等同样受它影响。HeroUI 3.2.4 默认是 `0px` 外边框加轻阴影，StoneFlow 改成了 `1px` 深色边框并清空阴影。用户已确认第 2、3、4、6、7 条的无硬框方向，但后续只能在获批字段的共享 recipe 中定向落地，不能越过范围改全局 token。
2. **“Current 很拥挤/叠起来”主要是 UI Lab 对照环境不等宽。** Upstream 与 Token 在窄 iframe 里计算 `sm` / `lg`，Current 却在外层桌面 viewport 中计算相同断点；Current 会在狭窄的第三列里强行排成两列。应修 fixture 的响应式基准，不应压缩 HeroUI Calendar 或修改产品密度来掩盖。
3. **“官方是圆的，Token 却偏方”是 StoneFlow 高阶圆角 token 的直接结果。** HeroUI 默认 `rounded-2xl/3xl/4xl` 分别为 16/24/32px；StoneFlow 将三档统一为 12px。Actions 的 Token 变方、ColorSwatchPicker 的默认 circle 变成圆角矩形都来自这里。全局恢复会波及许多 HeroUI 组件，建议保持 Actions 已确认的 Current recipe，只对明确具有“圆形”语义的 swatch 做组件级修正。

第 5 条所见的 Checkbox “两层圆角不一致”已经由运行时 computed style 证实：Current 外层 control 为 `4px`，`::before` 选中色层实际仍为 `6px`。源码虽然试图通过同一个 `:is(...)` 规则把两者都设为 4px，但伪元素分支没有生效；最小修正应让 `::before` 继承 control 的圆角，不新增另一套 token。

第 9 条 Compact Metadata 不是要再设计一遍，而是做 Avatar、Chip、Kbd、Separator 的原子回归和所有权归因；若视觉无异议即可 Keep。

### 已确认的圆角判定

圆角按组件语义与尺寸决定，不按“这一批统一一个数字”：16px Checkbox 等微型选择控件用 4px；28–32px 输入与选择控件用 6px；普通 surface 用 8px；overlay 用 12px；Button pill、Avatar 与 circle swatch 等具有圆形语义的项目使用全圆。第九批只记录并复用这套层级，不新增 token，也不为单个上游组件全局抬高 2xl、3xl、4xl。

## 2. 证据边界

- `package.json:34-36` 与已安装包 `node_modules/@heroui/react/package.json:2-4`、`node_modules/@heroui/styles/package.json:2-4` 均确认 OSS/Styles 为精确版本 `3.2.4`。
- 精确 CSS 数值、DOM slot 和状态条件以本地已安装的 3.2.4 包为版本锁定证据；HeroUI 官方 MCP 于 2026-08-31 返回的在线组件文档只用于核对公开语义与 anatomy，避免把当前在线文档中的漂移值冒充 3.2.4。
- Upstream 仅加载 Tailwind、HeroUI OSS/Pro CSS；Token 在其上只加载 `fonts.css` 与 `theme.css`；Current 再加载 `components.css` 与 `base.css`。证据见 `src/ui-lab/native-comparison/upstream.css:1-5`、`src/ui-lab/native-comparison/token.css:1-3`、`src/styles/index.css:1-9`。
- 研究过程未启动新的开发服务；主审查复用了用户已运行的 Vite 页面，补充了 SearchField、Checkbox 与 ColorSwatchPicker 的 computed-style/几何证据。尚未执行 Tauri 或跨平台 WebView 人工验收。

## 3. 逐项研究

### 1. Actions：Token 为什么比官方偏方

**锁定版事实**

- Button 与 ToggleButton 基础样式均使用 `rounded-3xl`：`node_modules/@heroui/styles/dist/components/button.css:4-5`、`node_modules/@heroui/styles/dist/components/toggle-button.css:5-7`。
- attached ToggleButtonGroup 会清空中间项圆角，只给首尾恢复 `rounded-s/e-3xl`：`node_modules/@heroui/styles/dist/components/toggle-button-group.css:34-51`。
- HeroUI 默认 `--radius: 0.5rem`，由此得到 `--radius-3xl: 1.5rem`（24px）：`node_modules/@heroui/styles/dist/themes/default/variables.css:33-35`、`node_modules/@heroui/styles/dist/themes/shared/theme.css:103-111`。
- StoneFlow 将 `--radius` 设为 4px，并在 Tailwind theme 中把 2xl、3xl、4xl 全部映射为 12px：`src/styles/theme.css:17-28`、`src/styles/theme.css:171-178`。因此 Token 忠实显示了 StoneFlow theme 的 12px，不是 HeroUI CSS 丢失。
- Current 对独立 Button/ToggleButton 使用 `--radius-pill`，但 attached group 用 `revert-layer` 回到组的首尾规则：`src/styles/components.css:6-14`、`src/styles/components.css:21-27`。

**结论与建议**

Actions 本身无须改。保留已确认的 Current 按钮 pill recipe；不要为了让 Token 看起来像 Upstream 而全局恢复 2xl/3xl/4xl，因为该 token 同时控制 Calendar cell、ColorSwatchPicker、Avatar、Chip 等多个家族。Token 的职责正是暴露这层主题影响。

公开语义参考：[HeroUI Button](https://heroui.com/en/docs/react/components/button)、[HeroUI ToggleButtonGroup](https://heroui.com/en/docs/react/components/toggle-button-group)。

### 2. Text Fields：去掉硬边框，但保留什么

**锁定版事实**

- HeroUI 默认 `--field-border-width: 0px`、`--field-border: transparent`，并提供三层轻微 `--field-shadow`：`node_modules/@heroui/styles/dist/themes/default/variables.css:21-24`、`:72-77`、`:157-168`。
- 这些变量映射成 `--border-width-field`、`--shadow-field`：`node_modules/@heroui/styles/dist/themes/shared/theme.css:45-56`。
- Input 与 TextArea 的原生 shell 均使用该边框宽度、边框色和 field shadow；focus/invalid 状态另由状态 utility 绘制：`node_modules/@heroui/styles/dist/components/input.css:1-15`、`:25-42`，`node_modules/@heroui/styles/dist/components/textarea.css:1-18`、`:28-42`，`node_modules/@heroui/styles/dist/utilities/index.css:8-28`。
- StoneFlow 将 field border 改为 1px、颜色改为较深的 `--border-secondary`，同时把 `--field-shadow` 清零：`src/styles/theme.css:9-14`、`:56-64`、`:95-97`、`:111-115`。这正是用户看到“硬框”的来源。
- Current 另有工作台密度与圆角 recipe：`src/styles/components.css:107-121`。它与外框所有权可以分开处理。

**已确认方向与实施边界**

回归原生感的**表面 recipe**，但不做全局 reset：

- 保留全局 `--field-border-width: 1px` 与 `--field-border`，避免连带移除 Radio、Date 等未获本批授权的必要边界；
- 后续仅对 `.input`、`.textarea`、`.search-field__group`、`.number-field__group`、`.select__trigger`、`.autocomplete__trigger` 定向设为无硬边框；
- primary 可恢复官方轻阴影，secondary 继续按上游规则 `shadow-none`，但阴影只作为表面层次，不能冒充 3:1 边界证明；
- 保留 StoneFlow 的 background、foreground、placeholder、hover、accent、invalid、disabled 颜色，以及 32px 工作台密度、字体与 6px control radius；
- 删除或改写当前两处弱 focus 覆盖，让 HeroUI 的 2px focus/invalid ring 成为明确状态提示。

现有审查合同记录 field/Switch 边界最差为 `3.513:1`；当前 `#85868a` 对常见表面实算为 `3.280–3.637:1`。相反，白色/近白表面和官方轻阴影只有约 `1.03–1.42:1`，不能据此继续声称静止态边界达到 3:1。W3C SC 1.4.11 允许由可见文字、图标或上下文识别控件而不绘制完整命中边界，但 focus、invalid 等必要状态仍须达到 3:1。参考：[W3C Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html#boundaries)。

公开语义参考：[HeroUI TextField](https://heroui.com/en/docs/react/components/text-field)。

### 3. SearchField：外框与末尾 X

**锁定版事实**

- SearchField.Group 与 Input 相同，外框直接消费 `--border-width-field` / `--field-shadow`：`node_modules/@heroui/styles/dist/components/search-field.css:23-35`。
- fixture 声明 `SearchField.ClearButton` 后，该子组件会渲染 slot=`clear` 的 CloseButton；SearchField Root 本身不会自动补出未声明的 ClearButton：`node_modules/@heroui/react/dist/components/search-field/search-field.js:18-41`、`:110-126`。
- 但根节点 `data-empty="true"` 时，官方 CSS 会把 clear button 设为 `pointer-events-none opacity-0`：`node_modules/@heroui/styles/dist/components/search-field.css:16-20`。按钮尺寸和图标仍有定义：`:133-139`。
- 本批 fixture 的 Global Search 带 `defaultValue='同步'`，Filter 没有初值；两者都声明了 ClearButton：`src/ui-lab/samples/ticket-09/heroUiOssAtomsFormsSamples.tsx:107-128`。
- fixture 使用 `variant='secondary'`；该变体按官方规则无阴影、用 filled default 背景：`node_modules/@heroui/styles/dist/components/search-field.css:142-153`。

**结论与建议**

- 外框跟随第 2 条的共享字段 recipe，不新增 SearchField 专属覆盖。
- 如果“最后面的 X 没有了”指空的 Filter，这是官方预期，不应强制常驻一个无可清空内容的按钮。
- 主审查已确认有值的 Current Global Search 中 X 仍存在、`opacity: 1` 且尺寸为 20×20；但 182px 的 input 与 X 被排进仅约 123px 宽的 group，X 落在 group 右边界之外并被 `overflow: hidden` 裁掉。它与下文 Current 断点错配是同一个 Lab 布局问题，不应改 ClearButton 显隐合同。

公开语义参考：[HeroUI SearchField](https://heroui.com/en/docs/react/components/search-field)。

### 4. NumberField：去掉外框

**锁定版事实**

- NumberField.Group 的外壳同样消费 field border/shadow：`node_modules/@heroui/styles/dist/components/number-field.css:17-31`。
- 增减按钮在组内另行声明 start/end separator：`node_modules/@heroui/styles/dist/components/number-field.css:118-174`。因此去掉 Group 外边框不等于删除步进按钮之间的结构分隔。
- fixture 使用 secondary variant：`src/ui-lab/samples/ticket-09/heroUiOssAtomsFormsSamples.tsx:134-156`；官方 secondary group 本就 `shadow-none` 并使用 default 填充：`node_modules/@heroui/styles/dist/components/number-field.css:176-187`。

**结论与建议**

跟随第 2 条统一移除 field 外边框即可；保留 filled secondary 背景、内部加减按钮分隔、pressed/disabled 和 focus-visible 状态，不做 NumberField 专属“无框组件”。

公开语义参考：[HeroUI NumberField](https://heroui.com/en/docs/react/components/number-field)。

### 5. Choice Controls：Checkbox 四角白缝与 Current 拥挤

**锁定版事实**

- 官方 Checkbox.Control 与其 `::before` 选中色层都使用同一个 `rounded-md`：`node_modules/@heroui/styles/dist/components/checkbox.css:84-101`；selected 仅把外边框设为 transparent 并将色层放大到 100%：`:139-148`。
- StoneFlow Current 试图同时把 control 与 `::before` 设为同一个 `--radius-sm`（4px），并在 `.checkbox` 局部把 field border width 设为 0：`src/styles/components.css:213-224`。
- 运行时测量显示 control 实际为 16×16、`border-radius: 4px`，`::before` 同为 16×16、`border-radius: 6px`。这正好解释了用户看到的四角白缝，也证明现有组合选择器只覆盖到了本体，没有覆盖伪元素。
- 审查前 Choice fixture 使用 viewport `sm:grid-cols-2`，而 Upstream/Token 的 iframe 与 Current 所在外层文档不是同一个响应式 viewport；当前已改为 fixture container query：`src/ui-lab/samples/ticket-09/heroUiOssAtomsFormsSamples.tsx:161-210`。

**结论与建议**

1. 让 `.checkbox__control::before` 直接继承 control 的圆角；不新增 indicator token，也不改 Checkbox 尺寸。
2. 第 8 条 Lab 响应式修正后，再复查 Choice Controls 的密度与换行。
3. 保留官方 selected、focus-visible、invalid、disabled 与动画状态。

Current 的“拥挤”应先归因于对照容器断点，而非 Checkbox/Radio/Switch 自身密度。

公开语义参考：[HeroUI Checkbox](https://heroui.com/en/docs/react/components/checkbox)。

### 6. Select / ListBox：去掉哪一层框

**锁定版事实**

- Select.Trigger 直接消费 field border/shadow：`node_modules/@heroui/styles/dist/components/select.css:17-35`。
- 裸 ListBox 只有 `p-1`、item 间距和 overflow 规则，没有外边框 recipe：`node_modules/@heroui/styles/dist/components/list-box.css:1-24`。
- fixture 同时展示带 trigger/popover 的 Select 与一个裸 ListBox：`src/ui-lab/samples/ticket-09/heroUiOssAtomsFormsSamples.tsx:215-254`。
- 三栏比较本身的每个 article 也有 `border border-separator`，这属于 Lab chrome：`src/ui-lab/native-comparison/NativeComparison.tsx:105-125`、`:161-175`。

**结论与建议**

用户已确认只让 Select.Trigger 跟随后续字段 recipe 去掉硬外边框，保留背景、indicator、focus/invalid、popover 与选中项状态。裸 ListBox 本来就不画外框，UI Lab 对照 article 也保持不变；两者都不新增“去框”覆盖。

公开语义参考：[HeroUI Select](https://heroui.com/en/docs/react/components/select)、[HeroUI ListBox](https://heroui.com/en/docs/react/components/list-box)。

### 7. ComboBox / Autocomplete：同一字段外框问题

**锁定版事实**

- ComboBox.InputGroup 本身只是相对定位的 inline-flex，实际输入壳由其中的 Input 持有：`node_modules/@heroui/styles/dist/components/combo-box.css:16-42`。
- Autocomplete.Trigger 自己消费 field border/shadow：`node_modules/@heroui/styles/dist/components/autocomplete.css:6-23`。
- 审查前 ComboBox 与 Autocomplete 并排使用 viewport `sm:grid-cols-2`；当前已改为 fixture container query：`src/ui-lab/samples/ticket-09/heroUiOssAtomsFormsSamples.tsx:268-317`。

**结论与建议**

复用第 2 条共享字段 recipe，不分别覆盖两个组件。保留 Input/Trigger 背景、clear button、indicator、popover、过滤与键盘 collection 行为；拥挤问题则由 Lab 响应式修正处理。

公开语义参考：[HeroUI ComboBox](https://heroui.com/en/docs/react/components/combo-box)、[HeroUI Autocomplete](https://heroui.com/en/docs/react/components/autocomplete)。

### 8. Date / Calendar / ColorSwatchPicker：Current 叠层与圆形色块

**锁定版事实：叠层**

- Calendar 固定为 `w-63 max-w-63`（Tailwind spacing 下为 252px），自身还声明了 container：`node_modules/@heroui/styles/dist/components/calendar.css:11-15`。
- 审查前 fixture 在外层 viewport `lg` 断点把 Calendar 与 ColorSwatchPicker 排成两列；当前已改为 fixture container query：`src/ui-lab/samples/ticket-09/heroUiOssAtomsFormsSamples.tsx:328-357`。
- Upstream/Token 渲染在各自 iframe；Current 直接渲染在外层页面的第三栏：`src/ui-lab/native-comparison/NativeComparison.tsx:91-145`、`:147-178`。因此桌面外层命中 `lg` 时，Current 会在窄栏内排两列，而窄 iframe 不命中 `lg`，产生用户看到的拥挤/叠层。

**锁定版事实：色块**

- ColorSwatchPicker 默认 variant 已经是 `circle`，无需在 JSX 再传一次：`node_modules/@heroui/styles/dist/components/color-swatch-picker/color-swatch-picker.styles.js:3-8`、`:41-48`。
- md item 是 32×32、`rounded-2xl`；swatch 继承 item radius：`node_modules/@heroui/styles/dist/components/color-swatch-picker.css:14-16`、`:55-60`。HeroUI 默认 2xl=16px，恰好形成正圆；StoneFlow 将 2xl 改成 12px，所以 Current/Token 变成圆角矩形。
- selected item 的 2px 选中色边与内部 swatch `scale(0.77)` 留白是官方明确设计，不是错位：`node_modules/@heroui/styles/dist/components/color-swatch-picker.css:40-47`。运行时也确认 Current item 为 32×32、半径 12px，选中 swatch 缩放后约 21.56×21.56。

**结论与建议**

- Lab fixture 改成以实际预览容器宽度决定列数（优先 container query），确保 Upstream、Token、Current 在同宽条件下得到同一布局；不要缩小 Calendar 去掩盖环境差异。
- 圆形色块做组件语义级 recipe：仅令 `.color-swatch-picker--circle .color-swatch-picker__item` 使用 `--radius-pill`，其内部 swatch 会继承；square variant 不受影响。
- 不建议仅为这一个控件全局恢复 `--radius-2xl`，因为会同时改变 Chip、Avatar 小尺寸等既有 Current 视觉。

公开语义参考：[HeroUI Calendar](https://heroui.com/en/docs/react/components/calendar)、[HeroUI ColorSwatchPicker](https://heroui.com/en/docs/react/components/color-swatch-picker)。

### 9. Compact Metadata：到底审查什么

**锁定版事实**

- ticket 已明确：这一 unit 覆盖 Chip、Avatar、Kbd、Separator；前 1–8 组已经确认过的 Current 只补 Upstream/Token/Current 归因，不要求重复审查：`.scratch/archive/ui-lab-native-alignment/issues/04-batch-09-heroui-oss-atoms-forms.md:11-18`。
- fixture 同时展示 Avatar 图片失败时的 fallback、Chip 长度/尺寸、纵向 Separator 与轻量 Kbd：`src/ui-lab/samples/ticket-09/heroUiOssAtomsFormsSamples.tsx:362-379`。
- 官方原子几何分别是：Avatar 默认 40px + `rounded-3xl`（`node_modules/@heroui/styles/dist/components/avatar.css:1-4`）；Chip 是紧凑 inline tag（`node_modules/@heroui/styles/dist/components/chip.css:1-10`）；Kbd 高 24px，light variant 透明（`node_modules/@heroui/styles/dist/components/kbd.css:1-5`、`:24-27`）；Separator 是水平/垂直 1px 结构线（`node_modules/@heroui/styles/dist/components/separator.css:3-18`）。
- Current 只额外保证 Avatar 的身份图像正圆和小尺寸 28px：`src/styles/components.css:97-105`。

**审查目的**

这里检查的是四件事：原子相对尺度是否仍协调、Avatar fallback 是否成立、Chip/Kbd 在长中文和紧凑行中是否换行或挤压异常、Separator 的方向/长度是否由正确所有者控制。它不是新的产品场景，也不要求重新设计已确认的 Current。当前无异议即可 Keep，并记录“HeroUI 持有原子行为与结构，StoneFlow 只持有身份圆形和工作台密度”。

公开语义参考：[HeroUI Avatar](https://heroui.com/en/docs/react/components/avatar)、[HeroUI Chip](https://heroui.com/en/docs/react/components/chip)、[HeroUI Kbd](https://heroui.com/en/docs/react/components/kbd)、[HeroUI Separator](https://heroui.com/en/docs/react/components/separator)。

## 4. 已确认的实施边界

ADR-0003 要求先完成第 9–14 批人工审查，再建立独立生产迁移工作包。以下是第九批研究时记录的实施边界；后续用户已明确要求把其中部分目标直接落实到生产路径，最终状态以当前差异和活跃 ticket 为准：

1. **Shared recipe：字段原生表面。** 保留全局 field token；后续只对获批字段 selector 定向去硬框、恢复表面层次并移除弱 focus 覆盖。上线前必须复验静止态识别，以及 focus/invalid 至少 3:1。
2. **Component recipe：圆形语义。** 后续只让 ColorSwatchPicker 的 circle variant 使用 pill radius；Actions 保持现状，不全局抬高 2xl/3xl/4xl。
3. **Choice recipe：单一圆角所有者。** 后续让 Checkbox `::before` 继承 control 的 4px 圆角，不新增另一套 token。
4. **UI Lab fixture：同宽响应式。** 已将 viewport breakpoint 改为同值 container breakpoint，覆盖 Text Fields、SearchField、Choice、Select/ListBox、ComboBox/Autocomplete、Date/Color；Upstream、Token、Current 现在按各自实际预览宽度决定列数。

明确不做：不让空 SearchField 常驻 X；不为每个字段家族复制一套“无框”CSS；不缩小 Calendar；不凭目测创造第二套 Checkbox indicator radius；不重新设计 Compact Metadata。

## 5. 实施后的验收重点

- 字段：default、hover、focus-visible、invalid、disabled 均可辨识；primary 去硬框后仍有轻表面层次，secondary filled 表面不被误加阴影；必要状态至少 3:1，静止态不以轻阴影冒充边界证明。
- SearchField：有值的 Global Search 显示 X，空 Filter 隐藏 X；键盘 focus 与 clear 行为不变。
- Checkbox：selected control 与色层圆角一致，无四角白缝；Radio/Switch 未被 field token 连带破坏。
- 对照：同一 review unit 的三栏在相同容器宽度下列数一致，无 Current 独有拥挤或叠层。
- ColorSwatchPicker：circle 真正为正圆、square 仍为方形；selected 的官方环与留白保留。
- Compact Metadata：fallback、长中文、窄宽和纵向 Separator 均正常即可 Keep。

## 6. 尚未验证

1. 尚未进行 Tauri、macOS/Windows WebView 人工验收；浏览器证据只证明 UI Lab 布局修复和现象根因，不代表后续生产视觉迁移已经完成。
2. 字段、Checkbox 与 circle swatch 的生产目标已进入当前工作树；浏览器 Lab 与自动化不能代替真实消费者及 WebView 回归签收。
