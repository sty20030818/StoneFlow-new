# StoneFlow UI Lab 人工审查与生产改造输入规格

**Status:** completed; archived; production migration transferred  
**Triage:** completed  
**日期:** 2026-08-28  
**长期门禁:** [ADR-0003](../../../Documents/01-架构/adr/ADR-0003-ui-lab-review-and-product-migration-gate.md)

2026-08-28，八批可在 Lab 内审查的项目均已由用户人工验证完成；Main / Launcher 继续作为真实应用外部验收项，不记为 Lab 已通过。[StoneFlow UI Lab 目标生产迁移](../ui-system-production-migration/spec.md)已完成并归档。

## 1. 文档职责

本规格详细记录本轮 UI Lab 审查中已经确认的需求、问题、目标结果和未来生产改造输入。它不修改已冻结的 `.scratch/archive/ui-system-lab/`，也不把 ADR 变成进度日志。

- ADR-0003：长期不变的 Lab-first 门禁、HeroUI/StoneFlow Owner 和生产迁移原则。
- `src/ui-lab/uiLabCatalog.tsx`：批次成员、对照项与当前审查状态的唯一运行时真相；Lab 清单直接从这里生成。
- 本规格：逐项设计理由、问题说明和已确认结果。
- 后续生产工作包：全部 Lab 批次结束后另建，承担真实代码迁移、删除旧路径和产品验收。

`Lab 审查完成` 只表示该批目标已经在 UI Lab 中确认，不表示生产代码已改造，也不表示 Main、Launcher 或 Tauri/WebView 已验收。

## 2. 总体目标与非功能要求

### 2.1 产品与视觉方向

- 不要求像素级恢复旧 StoneFlow；允许建立比旧样式更统一、规范、简洁、整齐、有条理且冷静的目标基线。
- 浅色、克制、高信息密度、低装饰；层级主要依靠排版、对齐、状态和轻量边界，不堆叠卡片、粗边框和无意义阴影。
- 全面覆盖高频共享规则、复杂状态、产品组合与明确 HeroUI 候选，但停止条件是继续增加样例已经不能发现新的共享规则、状态缺口或替换机会，不机械复制 HeroUI 官网或每个 `.tsx` 文件。
- StoneFlow 与 HeroUI 共用一个开发期 Lab；StoneFlow 用于确认产品目标，HeroUI 用于查看已采用能力与替换对照。
- 同一时间只挂载当前样例，避免 Overlay、焦点陷阱、动画和状态互相干扰。

### 2.2 工程与迁移方向

- 审查阶段先对齐 Lab，不继续零散修改生产组件。此前 Metadata Button、Warning token 与共享焦点样式曾被提前修改，用户接受这一次，但它不是后续流程的先例。
- 全部批次结束后建立一个统一生产改造工作包，按真实共享 Owner 拆分垂直 tickets。
- 允许破坏性重构与 hard cut，只追求长期干净结果；删除旧自实现、shadcn 遗留、重复 recipe、兼容 alias、无消费者 wrapper 和永久双轨。
- 继续遵守单一职责、高内聚低耦合、组件化、模块化、DRY、KISS 与清晰依赖方向；不为满足架构名词建立单实现 Port、Factory、DTO 镜像或 Lab 专用 Adapter。
- `theme.css` 是语义值 Owner；`components.css` 是共享 HeroUI recipe Owner；产品 Module 是产品结构、业务状态和必要动态几何 Owner。禁止页面级公共皮肤补丁。
- UI Lab 不写真实 Store、Query、Router、Tauri Command、数据库或跨窗口状态；无法可信隔离的行为转真实应用验收。

## 3. HeroUI 使用合同

- HeroUI OSS/Pro 是标准控件唯一平台。优先使用其原生结构、状态、键盘行为、Focus、Overlay、可访问性和动画。
- StoneFlow 只修改有证据且已确认的语义颜色、圆角、密度与产品语义状态；不得为了“像 StoneFlow”重新仿制 Checkbox、Input、Select、Menu 等上游控件。
- 不新增 `SfButton`、`SfCheckbox` 等一对一 wrapper，不新增第二套 token/variant runtime、Provider、平行组件库或 feature 私有皮肤。
- 已采用且与 StoneFlow 目标完全相同的 HeroUI 样例可作为批次对照项，不要求重复做一套视觉结论；保留独立预览仅用于快速查看真实上游能力。
- RowShell 是 StoneFlow 产品行外壳，不是 HeroUI List 组件；真实 TaskBoard 的集合行为继续使用既有 React Aria collection、selection 与虚拟几何合同。
- HeroUI Pro ListView 适合富内容或可执行结果列表，不直接替换带 sticky、分组、服务端 spacer 和外部滚动协议的 TaskBoard。

## 4. 已确认的全局视觉与交互规则

### 4.1 颜色

- Warning 比旧色更浅，并与 Info、Success、Danger 的强度协调；当前目标参考值为 `#c88a22`。
- 不再要求所有 Warning 场景统一使用白字。实色 Warning 在当前产品主要用于状态点；Soft Warning 使用深色文字合理。
- Lab 的语义颜色展示使用中性说明卡片与独立色样，不用整块实色文字卡片暗示不存在的产品用法。
- Sidebar 使用确认的中性灰阶：背景 `#efeff0`、Hover `#e7e7e8`、Current/Pressed `#e1e1e2`。Disabled、正文和 Focus 继续使用语义 token，不扩充任意灰色。

### 4.2 间距、圆角与高度

- 组件内部优先只使用两档基础间距：`4px / gap-1` 表达紧耦合内容，`8px / gap-2` 表达普通同级内容。
- `12px` 及以上只用于区块和页面层级，不继续扩充组件内部的微型间距词汇；`6px` 不作为新的全局间距档。
- Control、Surface、Overlay 继续分别使用少量语义圆角；Checkbox 明确为 `4px`。Pill 只用于 Chip、Avatar、状态标记和已确认的圆角填充式 Breadcrumb 等适用形态。
- MenuItem 属于 Control，使用 `6px`；外层 Popover 属于 Overlay，保持 `12px`，不让内外两层使用同一圆角。
- 控件高度维持 `28/32/36px`；Sidebar 采用 `36px`。

### 4.3 动作层级

- Primary：当前流程唯一主要动作。
- Secondary：明确但不抢主层级的动作，保留 HeroUI 原生灰底。
- Tertiary：低强调动作或离开当前流程的动作。
- Outline：工具栏等需要稳定边界的次级入口。
- Ghost：上下文已经清楚的轻操作、Breadcrumb 祖先项和 Metadata 属性入口。
- Danger：不可逆或高风险动作；Danger Soft：可恢复但仍需警示的动作。
- 不给 HeroUI 原生 Primary/Secondary 额外加灰色或黑色边框；用户已经对比后明确回退。
- 所有文本型 Metadata 属性入口统一使用 Ghost，不仅限任务详情；Rest 透明、Hover 中性填充、文字使用前景色，不再使用蓝色 Secondary 强调。
- Toolbar 当前“略浅”只记为体系观察项，不单独建立局部颜色；与 ButtonGroup、ToggleButtonGroup 的完整状态一起判断。

### 4.4 焦点与输入方式

- 不能因为不喜欢“框”而删除键盘焦点；Pointer Focus 与 Keyboard Focus Visible 必须区分。
- 直角外框、双框和四个白角通常来自同一通用规则同时作用于真实 `:focus-visible` 叶子和复合组件祖先的 `[data-focus-visible]`。禁止再给所有复合外壳统一画 ring。
- 焦点应由真实可操作叶子或具体组件 owner 绘制，并匹配控件圆角；Select、ComboBox、DatePicker、Tabs、Sidebar、Command 在 Escape 或 Tab 后不得额外出现祖先直角框。
- Tabs Panel 若确实进入 Tab 顺序，可以有与面板圆角匹配的可见焦点，但不能用直角浏览器外框包住整个组合。
- 强制颜色模式必须保留系统 `Highlight` 焦点，不以全局 `outline: none` 破坏可访问性。

## 5. 批次状态

当前权威状态以 `UI_LAB_REVIEW_BATCHES` 为准。八批可在 Lab 内审查的项目已经全部完成人工验证；Main / Launcher 保留为真实应用验收项。HeroUI 样例作为相应批次的对照项纳入完成度，但不重复承担 StoneFlow 产品结论。

| 批次 | 范围 | 当前结论 |
| --- | --- | --- |
| 第一批 | Foundations、Actions、Button | Lab 审查完成 |
| 第二批 | Fields、选择控件 | Lab 审查完成 |
| 第三批 | Navigation | Lab 审查完成 |
| 第四批 | Collections、Task Row | Lab 审查完成 |
| 第五批 | 集合元数据、Task Board | Lab 审查完成（6/6） |
| 第六批 | Feedback、Launcher | Lab 审查完成（6/6） |
| 第七批 | Overlays、焦点生命周期 | Lab 审查完成（10/10） |
| 第八批 | Product Scenes、真实桌面边界 | Lab 审查完成（3/3；另有 1 项转真实应用验收） |

## 6. 第一批：Foundations、Actions 与 Button

### 语义颜色与排版

- 排版本身没有发现需要单独改造的问题。
- Warning 调浅并匹配其他语义色的视觉强度；不再追求所有 Warning 白字。
- 颜色样例改成独立色样与中性说明，避免 Lab 示例误导生产使用。

### 几何、边界与图标

- 组件内部间距收敛为 `gap-1/gap-2`；更大间距属于结构布局。
- 保留 Control/Surface/Overlay/Pill 的语义边界，不为属性 Row 建立新的圆角体系。

### StoneFlow Button 与 HeroUI Button

- Button 原生 UI/UX 基本通过，重点是 variant 使用边界，不是重画按钮。
- StoneFlow 与 HeroUI Button 是同一上游组件和主题；HeroUI 条目作为对照，不重复形成另一份规则。
- Metadata 属性入口最终确定为 Ghost，不再用 Secondary 或蓝色强调。
- Primary/Secondary 试加灰边后被明确回退，保留 HeroUI 原生外观。

### 动作分组与 Toolbar

- 结构和交互没有明确问题。
- 颜色稍浅暂不单独修改；以后只在整体 ButtonGroup/Toggle/Toolbar 状态体系中处理。

### Link

- 只保留真实导航 Link；统一字号，不把当前项和无关按钮混进同一示例。
- 键盘焦点只能出现一层，不出现额外圆角容器或直角祖先框。

## 7. 第二批：Fields 与选择控件

### Input / TextArea / SearchField

- 外壳内不得再嵌套第二个可见输入框；Lab Sidebar Search 同样适用。
- Loading Spinner 与右侧边缘保留明确间距。

### NumberField / DateField / Select / ComboBox

- NumberField 不出现框中框。
- Select/ComboBox 在 Escape 后不得给外壳追加直角焦点框。
- HeroUI Input 与 Select 的原生外观通过，只处理共有的复合焦点问题。

### Checkbox / Radio / Switch / Toggle

- 使用 HeroUI 原生 Checkbox UI/UX，不仿制；无额外 Hover 外框，圆角固定为 `4px`。
- 保留原生 Primary 白底浅阴影与 Secondary 灰底无阴影，不增加额外边框。
- Label 与控件都能切换；Switch 必须真实可操作。
- 半选必须可交互，受控状态循环为 `mixed → true → false`。

### HeroUI SearchField 与 DatePicker

- SearchField 与 StoneFlow SearchField 共用“无框中框”规则。
- DatePicker 交互通过；Tab 聚焦不得在组件外追加直角框。

## 8. 第三批：Navigation

### Breadcrumb / HeroUI Breadcrumbs

- 不采用蓝色下划线 Link 外观；祖先项使用圆角填充式 Ghost Hover，预览底部不使用多余灰底。
- Current 使用 `aria-current='page'` 并不可再次激活；键盘焦点沿用 Link 语义且保持单层。

### Sidebar

- 行高使用 `36px`，结构和交互继续使用 HeroUI Pro 原生实现。
- 使用已确认三档灰色；Hover 必须明显。
- 键盘焦点只落在圆角 MenuItem 内容，不给集合外壳画直角框，也不留下四个白角。

### Tabs

- 当前 Tab 接受焦点；整个 Tabs/TabPanel 不得被直角外框包围。
- 方向键切换与 Disabled 跳过继续保留上游行为。

### Pagination

- 当前没有需要调整的问题。

### Command

- 搜索区使用原生 Command 输入结构和下分隔线，不出现独立直角输入框。
- 保留筛选、上下移动、Enter、Escape 和关闭后的焦点恢复。

### Settings Navigation

- 不在 Lab 复制第二份 Settings 导航；行为由现有自动测试负责。
- Hover、Focus、长中文和窄宽度留在真实 Main 中人工审查。

## 9. 第四批：Collections 与 Task Row

### RowShell

- RowShell 是 StoneFlow 产品外壳，不是 HeroUI List 组件。
- 集合内支持 `↑/↓/Home/End` 移动焦点；多选场景中方向键不能自动改变选择。
- Interactive Row 使用 Pointer cursor；Hover 为 `#e7e7e8`。
- Active 是“已打开”的持久状态，会持续使用中性灰，不等于 Hover；Lab 使用明确文案区分。

### Menu

- 左侧为 Icon + Label，右侧固定为 Check 列 + Kbd 列。
- 顶部包含 SearchField，右端显示打开菜单的 Kbd；危险项独立呈现。
- Enter/Delete 使用 HeroUI `Kbd.Abbr`，并与字母快捷键中心对齐。
- Escape 关闭并把焦点恢复到菜单按钮。

### ListBox

- 用于固定选项集合，也是 Select/ComboBox 的选项语义；不承担富搜索结果。
- 标题与“当前选中项”等 Description 使用 `4px` 间距。

### ListView / HeroUI ListView

- 用于富内容或可执行搜索结果；目标组合使用 `variant='primary'`、`selectionMode='none'`。
- 标题、副标题和时间需要清楚分层；Hover 使用可见中性灰。

### Task Row

- 使用 Primary Checkbox；未选时只在 Row Hover 或键盘可发现状态显示。
- Row Hover 为 `#e7e7e8`。
- 连续选中按 `single/first/middle/last` 计算；连接处去掉圆角，只保留整组外侧圆角。

### Group Header

- 独占一行，不伪装成普通 Task Row。
- 从左到右为折叠箭头、状态 Icon、标题、数量、右侧 `+` Ghost Button。
- 双击 Header 可以切换折叠；右键菜单、Sticky 和真实集合状态无需在 Lab 全量复现。

## 10. 后续待审批次

### 第五批：集合元数据与 Task Board

#### Table

- 当前没有生产消费者，暂时不为它建立产品场景或生产迁移任务。
- HeroUI 原生 Table 的选择、长中文、空值和水平溢出外观通过；作为能力对照保留，Lab 审查完成。

#### Labels（替代通用 Tag 样例）

- 当前通用 TagGroup 的“选中、禁用、逐项移除”不是 StoneFlow 的真实标签用法，原样例被否决。
- 产品目标参考任务属性：已选标签以 28px、带色点的紧凑项常驻，`+` Ghost Button 打开 HeroUI 原生可搜索多选 Dropdown；选项保持 `menuitemcheckbox` 单一交互语义并复用 Primary Checkbox 的纯视觉 Indicator，Checkbox、色点与标题统一使用 `8px / gap-2`。已选择项固定在前组但不显示“已选择 / 可添加”标题；指针点击 Checkbox 区域后保持 Dropdown 打开并立即更新，点击其余 Item 区域或使用键盘执行后先完成 HeroUI 退出动画，再提交选中状态，避免退出过程中露出重排。Labels 使用 `256px` 宽，搜索输入是可收缩列并固定保留尾部 `L` Kbd；包含双尾部列的操作菜单可使用 `288px`；通用简单菜单只保留 HeroUI `220px` 最小宽度，不建立单一固定宽度 token。浮层以标签组为稳定定位锚点，避免 Chip 增减只移动 `+` 而未触发 HeroUI 重定位。
- StoneFlow 当前尚无标签领域模型、持久化和命令；Lab 只验证产品假设，不提前实施生产能力。当前 Lab 交互与视觉已通过。

#### Chip

- Chip 不是无消费者组件；当前生产用于只读元数据、语义状态、分组计数、版本和同步状态等紧凑信息。
- 原生外观通过；Lab 改成真实消费者的三种代表用法，并通过 `size='lg'` 参数得到 28px 高度，不覆盖内部高度，Lab 审查完成。

#### Badge

- 当前没有生产消费者，只保留未来通知计数的能力对照。
- 原样例遗漏 `size='sm'`，落入默认 Medium，导致计数明显过大；计数与 `99+` 统一改为 Small 后通过。
- Badge 锚定的 Icon Button 恢复 Medium 正常尺寸，Badge 自身继续保持 Small。
- HeroUI Small 的无文本 Badge 对 24px Avatar 仍然过大，而且当前没有在线状态消费者；Lab 删除这个假场景，不提前造 Status Dot。

#### Avatar

- 当前真实消费者是 User App Menu，使用本地 `/avatar.jpg`。
- 原样例只展示不同尺寸和颜色的 fallback，虽然技术上合法，但不是产品使用且视觉误导；Lab 改成真实图片与无图片 fallback 两种 Medium 状态后通过。

#### Task Board

- Group Header 与第一条 Row 的垂直间距改为 `2px / gap-0.5`。
- Group Header 浅色背景改为 `#efeff0`。
- 浅色 Lab 暂用三档目标值：普通 Hover `#efeff0`、Selected `#e8e8f4`、Selected Hover `#dedeea`。
- 采用的是 Linear 的状态角色与本轮肉眼认可的浅色值，不把 Linear 品牌色直接写进产品组件。最终生产迁移应分别映射为语义 token（surface hover、selection、selection hover），由主题 Owner 统一持有并为其他主题派生对应值。
- 真实 TaskBoard 使用自身容器而非浏览器视口判断密度：容器小于 `560px` 时只保留 Checkbox、Priority、Status 与单行标题，整组右侧元数据隐藏；达到 `560px` 后按 `visibleProperties` 显示日期、Project、Space 与时间字段，空日期仍不占位。
- 标题始终单行省略，并仅在真实溢出时显示完整 Tooltip；Project / Space 最宽 `180px`，同样截断并提供 Tooltip。当前生产只有 `560px` 这一档：宽容器选择过多右侧字段时会先挤压标题，没有第二档按优先级逐项降级，这是生产改造需要解决的已知缺口。
- 分组折叠与宽度无关：折叠后 Header 常驻、任务 Row 从虚拟集合移除并缩短总高度；普通状态分组默认展开并持久化折叠偏好，固定 `customSections` 不参与折叠。Lab 只验证箭头与双击切换，不复制 Store、虚拟滚动、Sticky 和右键菜单。
- 第五批六项均已完成 Lab 审查；这些结论仍只是未来生产迁移输入。

### 第六批：Feedback 与 Launcher

- Empty / Error / Retry
- Skeleton / Spinner / Progress
- Alert / Toast
- Disabled / Invalid / Danger / Save
- Launcher：搜索、创建与恢复
- HeroUI EmptyState 对照

重点检查反馈层级、状态文字与颜色的配合、恢复入口、等待类型、Toast 生命周期以及 Launcher 可移植视觉；原生窗口激活和真实创建仍转 Tauri 验收。

- Empty / Error / Retry、Skeleton / Spinner / Progress、Alert / Toast、Launcher 生命周期与 HeroUI EmptyState 已通过。
- Disabled / Invalid / Danger / Save 已通过：必填输入由受控值派生 Invalid，有效输入后移除错误；聚焦 Invalid 时 Danger 的 ring 与 1px border 保持同色，不再叠出 Accent 蓝边。

### 第七批：Overlays 与焦点生命周期

- Tooltip
- Dropdown
- Popover
- Context Menu
- Modal
- AlertDialog
- Sheet
- Task Detail 焦点
- HeroUI Tooltip / Modal 对照

重点检查 Pointer/Keyboard 打开、初始焦点、Tab 循环、Escape、关闭路径、焦点恢复、Danger 确认和 Portal 残留。

- Tooltip、Popover、AlertDialog、Sheet、Task Detail 焦点及 HeroUI Tooltip / Modal 对照已通过。
- Dropdown 已通过。共享 Owner 已把 MenuItem 映射为 Control `6px`、外层 Popover 映射为 Overlay `12px`；样例继续使用 HeroUI 原生结构，不做局部圆角覆盖。
- Context Menu 原样例通过自定义 `render` 覆盖了 HeroUI Trigger 自带的 `context-menu__trigger` 类，丢失相对定位，导致游标锚点被错误地放到页面左上角。Lab 已改回原生 Trigger；右键与触屏长按共用 HeroUI 的坐标状态机，触屏长按阈值为上游既定的 `500ms`，鼠标按住不属于长按合同。该项已复审通过。
- Modal 的基础编辑场景与原生焦点生命周期通过。未来生产迁移可按真实消费者整理表单/编辑、信息展示等业务配方；危险确认继续使用 AlertDialog，复杂侧栏流程继续使用 Sheet。当前不提前建立无消费者的 Modal 变体或第二套基础组件。

### 第八批：组合场景与真实应用边界

- PageFrame 组合场景
- Settings Form：保存与重试
- Shell / Sidebar 场景
- Main / Launcher 原生窗口验收

重点检查孤立组件组合后的信息层级、长中文、窄容器和真实产品几何。Main/Launcher 的 Portal、WebView 激活、窗口断点、缩放与跨窗口一致性必须转真实 Tauri 应用验收。

- PageFrame 与 Shell / Sidebar 组合场景已通过。
- Settings Form 的失败态曾使用手写 Danger 边框包裹 Secondary 按钮，与第六批及 HeroUI 原生错误恢复配方不一致。Lab 已统一为 `Alert status='danger'` 与 Danger 重试按钮，保留输入和重试行为不变；该项已人工复审通过。
- Main / Launcher 不在 Lab 中伪造桌面行为，继续作为生产迁移后的真实应用验收项。
- 第八批完成后不继续为组件目录完整度新增批次。只有真实消费者提出当前样例无法回答、且会揭示新的共享状态、Owner 边界或替换决策时，才补最小 Lab 样例。

## 11. 全部 Lab 批次结束后的生产改造输入

以下七类是生产迁移输入，不机械映射为七个 ticket。正式工作包会按依赖有序的共享 Owner 切片重新归并，不按审查截图逐页打补丁：

1. **语义主题：** Warning、Sidebar 灰阶、Hover/Pressed/Current、Focus token 与必要强制颜色合同。
2. **动作语义：** Button variant 使用边界、Metadata Ghost、Toolbar 与动作组。
3. **Field 与复合焦点：** Input/Search/Number/Select/DatePicker 的框中框和祖先焦点，Checkbox `4px` 与原生状态。
4. **导航：** Breadcrumb Ghost、Sidebar 36px/三态、Tabs/Command/Settings Navigation 焦点所有权。
5. **集合与任务：** RowShell 状态、Menu 布局、ListBox/ListView 场景边界、Task Row 连续选择、Group Header 和 Task Board 组合。
6. **反馈与 Overlay：** Empty/Error/Retry、异步反馈、Toast 生命周期，以及 Tooltip、Menu、Context Menu、Modal、AlertDialog、Sheet 的共享配方与焦点恢复。
7. **真实应用验收与清理：** Main / Launcher、macOS/Windows WebView、窗口断点、缩放与跨窗口一致性；验收后删除旧自实现、重复 recipe 与兼容路径。

正式范围、实施顺序、排除项和验证合同已由[生产迁移规格](../ui-system-production-migration/spec.md)完成并归档。各迁移切片均已审计真实消费者，在共同 Owner 处 hard cut，删除旧路径与兼容代码，并运行与风险相称的聚焦测试、类型/Lint/边界/格式检查；真实应用 smoke 继续由既有统一产品验收工作包负责。

## 12. 明确不做

- 不建设两个独立、全量的组件展厅。
- 不复制 HeroUI 官网、源码或全部组件文档。
- 当前不引入 Storybook、截图基线、Chromatic 或新的运行时插件系统。
- 不把 UI Lab 接入正式 Router、生产导航、Tauri 菜单或发布产物。
- 不同时挂载全部复杂样例，不为画廊完整度安装可选 peer dependency。
- 不用静态 div 冒充真实 HeroUI 交互组件，不重新实现 HeroUI 原生控件的状态与动画。
- 不通过全局去焦点规则删除键盘焦点。
- 不让 Lab fixture 写入真实业务状态，不把 Lab 自动化通过当成用户审查完成。
- 不把 Lab 通过当成 Main、Launcher、Tauri/WebView 或跨窗口验收通过。
- 不为旧样式保留永久兼容层；生产迁移完成后必须删除旧实现。
