# HeroUI 原生能力 P0-P2 硬切

**Status:** completed; archived; manual acceptance transferred  
**Triage:** completed  
**日期:** 2026-08-25  
**采用基线:** HeroUI OSS 3.2.4、HeroUI Styles 3.2.4、HeroUI Pro 1.0.0-beta.8

2026-08-25，七个切片的代码、删除项、架构文档与自动化门禁均已完成；尚未执行的真实 Tauri、WebView 与 Windows 设备验收已移入 [统一产品验收](../../unified-product-acceptance/spec.md)，不记为已经通过。

## Problem Statement

StoneFlow 已经完成从 shadcn/Radix 到 HeroUI OSS/Pro 的主体迁移，但仍有七处标准能力没有真正交还 HeroUI：应用自绘滚动条、同步间隔的字符串数字输入、Space 固定色板的通用 Select、设置页自组 Switch 行、两个原生日期输入、PageFrame 中彼此分散的工具条控件，以及默认 Space 的通用 Select。

这些实现虽然能够工作，却让 StoneFlow 继续承担浏览器或 HeroUI 已经拥有的输入解析、键盘导航、Focus、选择状态、Overlay、滚动条绘制和可访问语义。最明显的例子是自建滚动条，它维护独立的 ResizeObserver、MutationObserver、requestAnimationFrame、thumb 几何和 pointer drag 状态机，而真实滚动仍然由浏览器 viewport 完成。

问题不在于“HeroUI 组件使用率不够高”，而在于标准能力的所有权仍然分裂。继续保留这些实现会形成第二套组件行为、重复状态源和兼容 CSS，也会让 HeroUI 升级、跨平台验收和长期维护成本不断增加。

## Solution

在一个总工作包内完成全部 P0、P1、P2 项目，并按七个可独立验证的垂直切片依次 hard cut：

| 优先级 | 改造项 | 最终所有权 |
|---|---|---|
| P0 | 原生滚动系统 | 浏览器负责滚动；HeroUI Styles 负责 scrollbar 外观；StoneFlow 仅保留虚拟列表 viewport contract |
| P0 | 同步间隔 NumberField | HeroUI 负责数字输入、步进、范围和键盘语义；StoneFlow 负责提交时机与 Tauri 持久化 |
| P0 | Space ColorSwatchPicker | HeroUI 负责有限色板选择；Space Module 负责 `colorKey` 与颜色值适配 |
| P1 | Settings CellSwitch | HeroUI Pro 负责 setting-cell Switch 结构与交互；StoneFlow 保留设置项文案和业务 mutation |
| P1 | HeroUI 日期能力 | HeroUI Calendar 负责日期选择；StoneFlow 保留既有 Popover/Modal、预设、清除和领域字符串 |
| P1 | PageFrame Toolbar | HeroUI Toolbar 负责工具条 landmark 与方向键导航；PageFrame 保留产品槽位 |
| P2 | 默认 Space CellSelect | HeroUI Pro 负责 setting-cell Select；StoneFlow 保留默认 Space mutation 与错误处理 |

每个切片完成时立即删除其旧实现、旧测试替身、旧样式规则和零消费者导出。不增加 feature flag、fallback、别名、双轨状态或兼容外壳。所有标准 DOM、键盘、Focus、Overlay 和选择行为以当前锁定版 HeroUI 为准；StoneFlow 只冻结业务流程、领域值、保存契约、路由和 Tauri 窗口几何。

## Canonical Terms

| 术语 | 定义 |
|---|---|
| **Scroll viewport** | 真正拥有 `scrollTop`、`scrollHeight` 和浏览器滚动行为的 DOM 节点 |
| **AppScrollArea** | 向 TaskBoard 暴露唯一 scroll viewport ref/context 的产品 Module；不是自定义 scrollbar |
| **Date-only value** | StoneFlow 跨 Feature 使用的本地日历日期字符串，格式为 `YYYY-MM-DD`，不含时间和时区 |
| **Date view adapter** | 在 HeroUI `DateValue` 与 Date-only value 之间转换的唯一共享适配层 |
| **SettingsToggleRow** | 六个设置项共同复用的产品组合；内部直接使用 CellSwitch，不拥有 Switch 状态机或皮肤 |
| **Hard cut** | 新实现与消费者在同一切片落地，旧实现及兼容出口立即删除，不保留双轨 |

这些术语只服务本工作包的实现沟通，不改变 StoneFlow 既有领域模型。Space 仍持久化 `colorKey`；Task 日期、同步策略和默认 Space 的领域含义均不变化。

## User Stories

1. 作为任务用户，我希望长列表使用可靠的系统滚动能力，从而可以稳定使用滚轮、触控板和滚动条 thumb。
2. 作为键盘用户，我希望 PageUp、PageDown、Home、End 和方向键遵循浏览器及 HeroUI 标准行为，从而不依赖自建 pointer-only 滚动条。
3. 作为 macOS 用户，我希望滚动条遵循 WKWebView 与系统设置，从而获得熟悉的自动显隐和触控板体验。
4. 作为 Windows 用户，我希望滚动条在 WebView2 中可见、可拖动且不会遮挡内容，从而不依赖 WebKit 私有样式。
5. 作为 TaskBoard 用户，我希望替换滚动条后 sticky header、虚拟化、折叠和增量加载保持不变，从而不会牺牲长列表性能。
6. 作为同步用户，我希望用标准数字控件设置同步间隔，从而可以直接输入或使用加减按钮。
7. 作为同步用户，我希望同步间隔始终限制在 1 到 1440 分钟，从而不会保存无效策略。
8. 作为同步用户，我希望编辑数字时不会每输入一位就持久化，从而避免重复 IPC 和抖动。
9. 作为同步用户，我希望离开数字控件或按 Enter 时保存，并在失败后看到后端 canonical 值，从而明确当前真实策略。
10. 作为 Space 用户，我希望直接从有限色板中选择颜色，从而不必通过文字下拉菜单推断颜色。
11. 作为键盘或读屏用户，我希望每个色块都有可访问名称和标准选择状态，从而颜色不是唯一信息载体。
12. 作为已有 Space 的用户，我希望改造前后的 `colorKey` 完全一致，从而不发生数据迁移或颜色漂移。
13. 作为设置用户，我希望点击开关行任意位置都能切换偏好，从而减少精确点击小控件的负担。
14. 作为设置用户，我希望开关的 disabled、selected 和 Focus 状态由 HeroUI 一致处理，从而不同设置项不会分叉。
15. 作为设置用户，我希望默认 Space 以紧凑的 setting-cell Select 呈现，从而与其他偏好项拥有一致交互模型。
16. 作为设置用户，我希望切换默认 Space 失败时仍保留真实默认项和错误反馈，从而不会出现视觉成功但持久化失败。
17. 作为 Launcher 用户，我希望继续使用今天、明天、本周和清除预设，同时可以通过 HeroUI Calendar 选择任意日期。
18. 作为任务编辑用户，我希望自定义截止、计划或提醒日期仍有保存、取消和移除流程，从而不会因组件替换改变提交语义。
19. 作为中文输入环境用户，我希望日期组件使用本地化的日历与键盘语义，从而不依赖浏览器原生日期输入的跨平台差异。
20. 作为跨 Feature 用户，我希望同一个日期在 Launcher、Command、ContextMenu 和任务详情中保持同一 `YYYY-MM-DD` 含义，从而不会产生时区漂移。
21. 作为键盘用户，我希望 PageFrame 的 Default View、筛选和显示动作处于一个真正的 Toolbar 中，从而可以用左右方向键连续导航。
22. 作为任务用户，我希望 Toolbar 改造不改变 Default View 的单选不为空规则，从而不会得到无查询基线的页面。
23. 作为筛选用户，我希望 FilterBar 仍只在 Draft 与 base 不同时出现，从而 Toolbar 迁移不改变查询语义。
24. 作为前端维护者，我希望 HeroUI 类型只存在于视图和适配层，从而领域、Tauri DTO 和业务状态不依赖 UI 供应商。
25. 作为前端维护者，我希望标准行为由 HeroUI 直接拥有，从而无需维护一对一 wrapper、状态镜像和兼容 CSS。
26. 作为前端维护者，我希望只有两个真实消费者共享 Date view adapter，从而复用是由真实重复驱动，而不是提前抽象。
27. 作为前端维护者，我希望 AppScrollArea 只保留 viewport ref/context 这一深 Interface，从而删除视觉实现后仍为 TaskBoard 提供高杠杆能力。
28. 作为代码审阅者，我希望每个切片都能独立证明行为并删除旧消费者，从而容易判断改动是否完成。
29. 作为依赖维护者，我希望业务源码直接使用的日期包被声明为直接依赖，从而不依赖 Bun hoist 或传递依赖的偶然存在。
30. 作为发布维护者，我希望 HeroUI Pro 仍保持精确锁版且没有 fallback，从而升级风险集中在既有供应链门禁。
31. 作为产品负责人，我希望本轮只改变标准组件所有权，不夹带新的业务能力或视觉重设计，从而可以独立验收架构收益。
32. 作为未来维护者，我希望文档不再声称 StoneFlow 拥有自绘滚动条或原生日期输入，从而架构真源与代码一致。

## Implementation Decisions

### 1. 总体架构

- HeroUI OSS/Pro 是唯一标准 UI 平台。标准输入、选择、键盘导航、Focus、Overlay 和 scrollbar recipe 不在 StoneFlow 重写。
- HeroUI 是最外层 UI adapter。领域类型、应用用例、Tauri DTO、Query cache 和持久化接口不得导入 HeroUI 或 React Aria 类型。
- 本工作包不新增通用 UI facade、Provider、variant runtime、视觉 token 镜像或一对一透传 wrapper。
- 一个产品组合只有在隐藏真实业务编排或被多个消费者复用时才保留。AppScrollArea 与 SettingsToggleRow 符合该条件；默认 Space CellSelect 只有一个消费者，直接组合。
- 所有迁移采用 controlled mode。HeroUI 不成为第二份业务事实源。
- 现有 HeroUI OSS/Pro 版本保持精确锁定；本工作包不顺带升级依赖版本。

### 2. P0-A：原生滚动系统 hard cut

- 浏览器 DOM 是唯一滚动实现。HeroUI `scrollbar` utility 只负责读取既有主题 token，不创建第二个滚动层。
- AppScrollArea 保留 wrapper、forwarded ref、viewport context、真实 overflow viewport 及稳定 viewport 标识；删除自绘 thumb、视觉 overlay 和所有观察/拖拽状态。
- TaskBoard 继续通过同一个 viewport ref 驱动 TanStack Virtualizer 与 sticky 计算。不得替换为 ScrollShadow、ListView 或另一个滚动节点。
- 删除全局隐藏原生 scrollbar 的标准属性与 WebKit 私有规则。不得新增 `::-webkit-scrollbar` 皮肤。
- 删除只为自绘 thumb 观察内容高度而存在的 extent 属性；TaskBoard 的真实高度、placeholder extent 和虚拟几何继续保留。
- 普通内容区继续使用 HeroUI ScrollShadow。由 ScrollShadow 已拥有的 overflow 与 scrollbar 不在调用方重复声明。
- ScrollShadow 上仅为旧全局隐藏规则或结构测试存在的 scroll hook 应删除；AppScrollArea 的 viewport 标识因真实运行时和测试 seam 继续保留。
- Launcher 等空间极窄且已经有明确渐隐提示的区域可以保留显式 `hideScrollBar`；主页面、TaskBoard 和详情正文不得隐藏 scrollbar。
- 简单横向或纵向 overflow 容器直接组合原生 overflow 与 HeroUI scrollbar utility，不为它们创建新 Module。

### 3. P0-B：同步间隔 NumberField

- 用 HeroUI NumberField compound anatomy 替换原生 number Input 和 TextField 字符串组合。
- NumberField 使用受控数字草稿，范围为 1 到 1440，步进为 1，禁用状态与同步 busy 状态一致。
- NumberField 负责输入解析、增减按钮、键盘步进、范围和 field validation；StoneFlow 不再维护 string-to-number 解析分支。
- 输入、方向键和增减按钮只更新本地草稿。焦点离开整个 NumberField 或用户按 Enter 时提交一次。
- 从 NumberField 内部 Input 移动到增减按钮不视为离开整个字段，不得提前或重复提交。
- 提交前规范化为有效整数；与当前 canonical 策略相同则不调用 Tauri。
- 保存成功后使用后端返回的 canonical policy 更新草稿；保存失败时刷新 canonical 状态并显示既有错误反馈。
- 切换同步模式时继续保留最后一次有效间隔。模式 mutation 与间隔 mutation 仍共用现有同步策略用例，不新增第二持久化接口。

### 4. P0-C：Space ColorSwatchPicker

- 用 HeroUI ColorSwatchPicker 表达现有五色有限 palette，不引入自由取色能力。
- Space Module 维护单一、显式的 `colorKey`、可访问名称与 CSS color value 映射。不得从 Tailwind class 字符串反向解析颜色。
- HeroUI `Color`/颜色值只存在于 Space 的 view adapter；表单、前端领域类型、Tauri DTO 和数据库继续传递现有 `colorKey`。
- adapter 必须双向映射且对当前五个 key 一一对应。未知持久化 key 继续使用既有默认视觉回退，但编辑提交时只能产生合法 palette key。
- 每个 swatch 必须有文本等价名称；选中、Focus、disabled 和键盘导航使用 HeroUI 原生语义。
- 新建与编辑 Space 共用同一 palette 和 adapter，不复制映射。
- 删除颜色 Select、颜色 ListBox item、手写 swatch 圆点和只为它们存在的选中展示代码。

### 5. P1-A：Settings CellSwitch

- 用当前锁定版 HeroUI Pro CellSwitch 替换设置页八个自组 Switch 行。
- 保留一个 SettingsToggleRow 产品 Module，因为它有多个真实消费者并统一承载 label、description、selected、disabled 与业务 onChange Interface。
- SettingsToggleRow 内部直接使用 CellSwitch compound anatomy，不暴露 CellSwitch slot，不复制 Switch thumb、Focus、hover、selected 或 disabled CSS。
- 整行点击、键盘切换、读屏名称和 disabled 行为由 CellSwitch 接管。
- SettingsSection、SettingsStack、SettingsPreferenceGroup 和诊断信息行不属于 Switch primitive，不因本迁移被错误删除。
- 如果迁移后旧 SettingCheckboxRow 没有消费者，则直接删除旧命名、旧实现和只验证旧 DOM 结构的测试。
- 不提供 OSS Switch fallback；Pro beta 行为不符合契约时应修正调用或阻断该切片，而不是保留双轨。

### 6. P1-B：HeroUI 日期能力与 Date view adapter

- 采用 HeroUI Calendar 作为两个现有产品 overlay 中的日期选择 primitive，不嵌套第二层 DatePicker Popover。
- Launcher 保留现有日期触发按钮、Popover owner、今天/明天/本周预设、清除动作和选择后立即更新草稿的行为。
- 全局自定义日期 Modal 保留标题、说明、保存、取消、移除和 Escape 处理；Calendar 只更新 Modal 内的日期草稿，提交仍由保存按钮发生。
- 建立唯一共享 Date view adapter，在 HeroUI `DateValue` 与 StoneFlow Date-only value 之间双向转换。
- Date view adapter 的 Interface 只接受和返回日期值，不包含任务字段、Launcher action、Modal 状态或持久化调用。
- `DateValue` 不得进入 Launcher reducer、Command registry、dialog store、Task DTO、Tauri API 或领域 Module。
- `YYYY-MM-DD` 的现有含义保持为本地日历日期，不转换为 UTC timestamp，不引入时区偏移。
- 将 `@internationalized/date` 以与当前锁定依赖树兼容的版本声明为直接 dependency；业务源码不得依赖传递安装。
- 删除两个原生 `type=date` 输入、重复日期解析/格式化分支以及仅验证原生输入 DOM 的测试。

### 7. P1-C：PageFrame Toolbar

- PageFrame 的 Default View Toggle、Filter action 和 Display action 组合进一个 HeroUI Toolbar，并提供稳定的可访问名称。
- Toolbar 使用水平标准行为。Tab 进入或离开工具条；左右方向键在可用控件之间移动；Enter/Space 执行当前控件。
- Default View 继续由 ToggleButtonGroup 单选管理，必须始终有且只有一个选中项；Toolbar 不创建第二份 selection state。
- Filter 和 Display 继续使用各自产品 action；Toolbar 只负责 landmark 与键盘导航，不理解筛选或显示领域状态。
- FilterBar 位于 Toolbar 外，仍只在 Filter Draft 与 base 语义不同时出现。
- PageFrame 继续只提供 Header、Toolbar、Body 产品槽位；不新增配置对象、通用 toolbar builder 或 feature-specific props。
- 删除为了散落控件排列而存在、且 HeroUI Toolbar 已拥有的键盘处理或无语义 wrapper；外部布局尺寸仍由 PageFrame 负责。

### 8. P2：默认 Space CellSelect

- 用当前锁定版 HeroUI Pro CellSelect 替换默认 Space 的普通 Select 组合。
- CellSelect 直接存在于 General Settings 产品 Module，不创建只有一个消费者的 SettingsSelect wrapper。
- 当前默认 Space id 仍由现有 Query 与 mutation Interface 控制；CellSelect 不保存独立业务状态。
- 选项仍只包含可选 Space，当前值、pending、disabled、空列表和失败反馈保持现有产品语义。
- mutation 成功后以服务端/Query canonical 数据为准；失败时不得停留在未持久化的视觉值。
- label、value、indicator、popover、键盘和 Focus 由 CellSelect compound anatomy 接管，不复制 Select 内部皮肤。
- 不迁移其他已经正确使用 HeroUI Select 的业务字段。CellSelect 只用于这一项已经批准的 P2 setting-cell 场景。

### 9. 依赖、文档与删除策略

- 仅新增业务源码直接使用的日期依赖；不引入 number、color、scrollbar 或 toolbar 的额外第三方包。
- 每个切片先让新消费者通过现有产品 Interface，再删除旧实现。不得先加 adapter 后长期保留无人使用的旧路径。
- 删除由本轮产生的未使用 import、类型、CSS hook、测试 mock、re-export、注释和架构描述。
- 更新系统设计、界面系统、前端架构和样式架构中关于自绘 scrollbar、原生日期输入及设置控件所有权的陈述。
- 不为达到净删除数字而删除领域或回归测试。成功标准是删除重复所有权和状态机，而不是单纯追求 LOC。
- 实际交付遵照任务发起人的后续指令分为 P0 与剩余 P1/P2 两个可审阅批次；每批使用中文 Conventional Commit。

## Delivery Order

1. **P0-A 原生滚动系统**：先删除最大、最独立的第二状态机，并建立跨平台 smoke 基线。
2. **P0-B NumberField**：收口同步设置中的字符串数字状态。
3. **P0-C ColorSwatchPicker**：建立 Space colorKey/color adapter 并替换有限色板。
4. **P1-A CellSwitch**：迁移八个设置 toggle row，保留深的产品组合。
5. **P1-B Calendar + Date view adapter**：先建立共享日期 adapter，再分别迁移 Launcher 与全局 Modal。
6. **P1-C Toolbar**：在控件本身稳定后收口 PageFrame 键盘导航。
7. **P2 CellSelect**：最后迁移低收益但已批准的默认 Space setting cell。

每一步必须在进入下一步前满足该切片的 focused tests、类型、边界与格式检查。任何切片失败时保持工作树可诊断，不用兼容层掩盖失败。

## Acceptance Criteria

### 全局

- 七个 P0-P2 项目全部完成，没有“先保留旧版以后再删”的兼容路径。
- HeroUI/React Aria 类型没有进入领域、应用、Tauri DTO 或持久化 Interface。
- 没有新增一对一 UI wrapper、Provider、第二套 variant、CSS 状态机或通用配置层。
- 原有业务流程、领域值、路由、同步接口和 Tauri 窗口几何保持不变。
- 所有新增依赖均为业务源码直接使用且已明确声明。

### 滚动

- 仓库不存在第一方 scrollbar thumb、thumb drag、ResizeObserver/MutationObserver/rAF 滚动条实现。
- AppScrollArea 的 forwarded ref 与 viewport context 仍指向同一真实 overflow 节点。
- TaskBoard virtualizer、sticky、折叠、placeholder extent、续页和滚动位置不变。
- 主页面、TaskBoard 和详情正文使用 HeroUI 主题 scrollbar；仅批准的窄区域隐藏 scrollbar。
- 不存在全局 `scrollbar-width:none` 或 WebKit scrollbar 隐藏兼容规则。

### NumberField

- 同步间隔以 HeroUI NumberField 呈现，允许输入与步进，范围为 1 到 1440。
- 编辑期间不重复调用 Tauri；离开整个字段或按 Enter 时最多提交一次。
- 无变化不提交；成功采用 canonical 返回值；失败恢复 canonical 值并保留错误反馈。
- 代码中不存在该字段旧的字符串 parse/clamp 双轨。

### ColorSwatchPicker

- 新建和编辑 Space 均显示五个可命名、可键盘选择的 HeroUI swatch。
- 每个合法 `colorKey` 可无损映射到唯一颜色并映射回来。
- 提交仍只发送 `colorKey`，没有 schema、DTO 或数据库迁移。
- 不存在旧颜色 Select、ListBox 或重复 swatch markup。

### CellSwitch 与 CellSelect

- 八个 Sidebar 设置项通过 SettingsToggleRow 使用 CellSwitch，整行可点击且可键盘切换。
- 默认 Space 使用 CellSelect，选项、成功、失败、pending 和 disabled 行为保持正确。
- 不存在 Pro fallback、旧 Switch/Select 双轨或局部状态皮肤。

### 日期

- Launcher 三个日期字段保留预设、清除与自定义日期选择。
- 全局自定义日期 Modal 保留保存、取消、移除和原调用入口。
- 两处 HeroUI Calendar 共享同一 Date view adapter，跨出 adapter 后只有 `YYYY-MM-DD`。
- 空值、月末、闰日、无效日期和重新打开既有日期均有确定行为。
- `@internationalized/date` 是直接 dependency，不通过传递依赖使用。

### Toolbar

- PageFrame 工具区拥有 Toolbar landmark 和可访问名称。
- Tab、左右方向键、Enter/Space 遵循 HeroUI Toolbar 行为。
- Default View 始终单选且不为空；Filter、Display 与 FilterBar 语义不变。
- Toolbar 不持有筛选、显示或路由的第二份业务状态。

## Testing Decisions

### 测试原则

- 测试只观察产品行为与稳定 Interface，不断言 HeroUI 私有 DOM 深度、内部 slot 顺序、BEM class 全量快照或实现状态。
- 使用现有最高 seam。七项改造跨越不同产品表面，强行合并成一个全局 E2E seam 会降低定位能力，因此每个产品表面保留一个最高行为 seam。
- 删除只保护旧组件结构、旧 mock 或兼容分支的测试；保留并加强曾发生回归、领域值往返和键盘行为测试。
- jsdom 无法证明 scrollbar thumb、真实 layout、Popover 定位或 WebView 行为；这些必须进入真实 Tauri smoke，不得冒充自动化通过。

### 自动化 seam

1. **AppScrollArea + TaskBoard**
   - forwarded ref 与 viewport context 指向同一节点。
   - viewport 是唯一 overflow owner，并使用 HeroUI scrollbar utility。
   - TaskBoard 长列表、sticky、折叠、滚动定位、续页 placeholder 与焦点桥回归。

2. **SettingsPage**
   - NumberField 的输入、步进、focus-exit、Enter、无变化、失败回滚。
   - CellSwitch 的公开 switch mutation、label 行结构、disabled、pending、失败反馈与八个设置项映射；真实整行点击和键盘激活由 Tauri smoke 验证。
   - CellSelect 的当前值、选择、pending、失败回滚和空列表。

3. **SpaceEditorDialog**
   - create/edit 默认 swatch。
   - 五色键盘选择和可访问名称。
   - `colorKey` 往返与提交 payload。

4. **LauncherPage 与 Shell 全局 Overlay**
   - Launcher 预设、清除、Calendar 选择及草稿更新。
   - 全局 Modal 打开既有值、选择、保存、取消、移除。
   - Command、ContextMenu、详情入口继续打开同一个日期流程。

5. **PageFrame**
   - Toolbar landmark、名称和键盘移动。
   - Default View 单选不为空与同步反馈。
   - Filter/Display action 可达，FilterBar 仍在 Toolbar 外按 dirty 条件出现。

6. **Date view adapter**
   - 空值、普通日期、月末、闰日、格式错误和双向 round trip 的纯测试。
   - 明确证明 adapter 不引入时区转换。

### 根级门禁

- 受影响的 focused Vitest suites。
- `bun typecheck`。
- `bun lint`。
- `bun lint:boundaries`。
- `bun format:check`。
- `bun check:animations`。
- `bun run build`。
- 依赖变更后执行 frozen install 或等价 lockfile 一致性检查。

### 真实 Tauri Smoke

- macOS WKWebView 与 Windows WebView2 各验证一次滚轮、触控板、thumb drag、PageUp/PageDown、Home/End。
- TaskBoard 验证长列表、折叠、sticky 顶替、续页 placeholder、短内容变长和长内容变短。
- Launcher 验证 Calendar Popover、键盘选择、Escape、外部点击和窗口边界。
- 主应用验证 Calendar Modal、焦点恢复、保存/取消/移除和 Command/ContextMenu 入口。
- Settings 验证 NumberField 步进、CellSwitch 整行点击、CellSelect Popover 与错误反馈。
- 未实际执行的设备或路径保持“待验收”，统一登记到既有产品验收工作包，不宣称通过。

## Out of Scope

- 不继续调整上一轮 UI 视觉还原、字体、圆角、间距、阴影、图标或 Hover/Selected 配色。
- 不升级 HeroUI OSS、Styles 或 Pro 版本。
- 不用 Pro ListView、DataGrid 或 Kanban 替换 TaskBoard。
- 不用 Pro Command、ListView 或 AppLayout 替换 Launcher。
- 不改 Launcher 固定窗口、Create focus lane、IME、selection feature 或搜索结果架构。
- 不改 Breadcrumbs 与 TanStack Router 的既有组合。
- 不引入自由取色 ColorPicker、任意颜色字符串或 Space schema 迁移。
- 不用 CellSelect 批量替换其他已正确使用 HeroUI Select 的业务字段。
- 不把 HeroUI DateValue 写入领域、Zustand、Tauri DTO 或数据库。
- 不改变同步策略后端范围、默认值、IPC contract 或后台调度。
- 不创建新的 CONTEXT、领域实体、数据 migration 或 UI ADR。
- 不创建外部 Issue、PR，不自动暂存、提交或推送。

## Further Notes

### 已确认决策

2026-08-25，任务发起人确认：

- 允许标准 DOM、键盘、Focus 和 Overlay 行为按 HeroUI 最佳实践变化。
- 七项采用一份总 Spec、七个独立 hard-cut ticket。
- CellSwitch 与 CellSelect 直接使用当前锁定的 Pro beta，不提供 fallback。
- 使用产品表面的最高行为 seam，并将真实 WebView 验收与自动化证据分开。
- 主内容恢复 HeroUI 主题 scrollbar，只在明确批准的窄区域隐藏。
- NumberField 保留 focus-exit/Enter 提交，不逐键持久化。
- 两个现有 overlay 使用 HeroUI Calendar，不嵌套第二层 DatePicker Popover。
- DateValue 只存在于共享 view adapter，跨出后仍为 `YYYY-MM-DD`。
- PageFrame 采用 HeroUI 标准 Toolbar 键盘模型。

### 架构判断

- 本轮没有改变 StoneFlow 领域模型，不更新领域术语表。
- ADR-0002 已经决定 HeroUI 是唯一 UI 平台、标准行为归上游、产品语义归 StoneFlow，因此无需新增 ADR。
- Hexagonal Architecture 在本轮体现为 UI adapter 不越过既有产品 Interface，而不是为每个控件新增 port。只有日期转换存在两个真实消费者，值得建立共享 adapter。
- Pro beta 的风险由精确锁版、无 fallback、focused regression 和现有供应链门禁承担，不用兼容层稀释。

### 估算与删除口径

- 原生滚动切片可确定删除至少 266 行第一方 OverlayScrollbar 实现，另有旧 CSS、mock、hook 和文档删除。
- 其他切片可能因 HeroUI compound anatomy、日期 adapter 和行为测试增加代码。评价标准是重复状态机与供应商责任是否删除，不承诺整个工作包必然净减固定 LOC。
- 任何零消费者兼容代码在对应切片删除；不为达到数字删除仍有价值的产品组合或回归测试。

### 实施与自动化记录

- P0 已完成原生 scrollbar、NumberField 与 ColorSwatchPicker hard cut；P1/P2 已完成八个 CellSwitch、两处 Calendar、PageFrame Toolbar 与默认 Space CellSelect hard cut。
- 日期边界只保留严格 `YYYY-MM-DD` ↔ `CalendarDate` 适配；原生日期输入、重复 parser、默认 Space 旧 Select、设置旧 Switch 行与日期弹窗零消费者 `fieldKey` 已删除。
- `bun install --frozen-lockfile` 无变更；focused suites 86/86、全量 Vitest 187 files / 923 tests、脚本测试 17 files / 157 tests、类型、边界、动画、格式与生产构建均通过。Lint 仅保留仓库既有 React Compiler warnings。
- 未启动开发服务或 Tauri，未运行真实 macOS/Windows 验收；未改 Rust，因此未新增或运行 Rust 测试。

### Source of Truth

- [HeroUI UI/UX 还原与组件复用研究](./research.md)
- [领域模型](../../../Documents/01-架构/A1-领域模型.md)
- [系统设计](../../../Documents/01-架构/A2-系统设计.md)
- [界面系统](../../../Documents/01-架构/A3-界面系统.md)
- [ADR-0002：以 HeroUI OSS/Pro 作为唯一 UI 平台](../../../Documents/01-架构/adr/ADR-0002-heroui-ui-platform.md)
- [统一产品验收](../../unified-product-acceptance/spec.md)
- [HeroUI Scrollbar 官方文档](https://heroui.com/en/docs/react/getting-started/styling#scrollbars)
- [HeroUI NumberField 官方文档](https://heroui.com/en/docs/react/components/number-field)
- [HeroUI ColorSwatchPicker 官方文档](https://heroui.com/en/docs/react/components/color-swatch-picker)
- [HeroUI Calendar 官方文档](https://heroui.com/en/docs/react/components/calendar)
- [HeroUI Toolbar 官方文档](https://heroui.com/en/docs/react/components/toolbar)
- [HeroUI Pro CellSwitch 官方文档](https://heroui.pro/docs/react/components/cell-switch)
- [HeroUI Pro CellSelect 官方文档](https://heroui.pro/docs/react/components/cell-select)

本 Spec 是实施范围和验收合同。长期领域、系统、界面与依赖方向仍由既有架构文档和 ADR 维护，不建立平行真源。
