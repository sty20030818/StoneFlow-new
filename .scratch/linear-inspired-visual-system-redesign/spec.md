# StoneFlow Linear-inspired 视觉系统重设计

**Status:** ready-for-agent

## Problem Statement

StoneFlow 已经具备稳定的桌面生产力信息架构与领域行为，但视觉仍缺少一个统一、明确且由 StoneFlow 自己拥有的系统：部分用户可达表面仍暴露未经审视的 HeroUI 默认皮肤，部分视觉规则又散落在旧 token、全局组件样式与 feature 局部实现中，导致 Shell、任务集合、浮层、详情、设置和 Launcher 之间的密度、层级与交互状态不够一致。

用户喜欢 Linear 当前公开界面体现的设计理念：低噪、高密度、主内容优先、导航后退、克制强调与稳定空间关系；但不希望复制 Linear 私有源码、资产或不可验证 token，也不希望 StoneFlow 变成 Linear 的品牌复制品。当前需要的是一次独立视觉系统重设计，不是复刻旧 StoneFlow，也不是继续接受组件库默认外观。

用户只需要浅色界面，不需要暗色模式或为未来预留一套未维护的暗色脚手架。同时，用户希望在不改变中性色、领域状态色和产品行为的前提下，从六个精选 Accent 中选择当前设备的主题强调色，默认采用独立校准的钴蓝方向。

## Solution

建立一套由 StoneFlow 独立实现并完整拥有的 Linear-inspired 浅色视觉系统。设计以 Linear 公开可见的视觉层级、密度与交互关系为高保真参考，视觉差异旋钮约为 `4/10`；不复制其私有实现、品牌资产或无法验证的精确规格。

视觉基线采用既有低色度冷灰中性色、约 `8/10` 的桌面生产力密度和约 `2/10` 的克制动效。动效只保留 HeroUI OSS/Pro 已提供且与状态反馈必要相关的行为，并继续尊重 reduced motion；StoneFlow 不新建第一方动效语言。

HeroUI OSS/Pro 继续负责标准组件的行为、结构、Overlay 语义、键盘交互与可访问性。StoneFlow 负责全部视觉结果：语义值由唯一主题层拥有，HeroUI OSS/Pro 的公共 BEM 与 data-state 皮肤由唯一全局组件层拥有；产品组件只保留稳定结构、业务语义与必要动态几何，feature 不再重画通用控件。

浅色中性色、排版、几何、状态色、阴影与层级保持一套稳定基线。Accent 只改变被明确登记的强调语义，不改变冷灰中性色，也不重映射 Success、Warning、Danger 与 Info 的领域含义。第一版提供六个精选 Accent：钴蓝、海洋蓝、烟紫、松柏、梅紫、石墨；默认钴蓝以用户提供的公开视觉参考 `#6E78D5` 和 Hover 参考 `#5F6AC1` 为方向锚点，但这些值不被宣称为 Linear 官方 token，最终角色组合必须满足可读性与状态辨识要求。

Accent 偏好只保存在当前设备，选择后立即作用于主窗口，并在 Launcher 每次呈现前恢复同一选择；两个入口在 React 挂载前应用已保存的 Accent。未知、损坏或缺失的本机值回退默认钴蓝。不增加跨设备同步、账户配置或任意取色器。

视觉落地先用最少的代表性表面验证完整状态矩阵，再横切到全应用：Shell/Sidebar、MainCard/PageFrame、TaskBoard/RowShell、Command/Menu/Popover、Modal/Sheet/Detail、Settings/Form 与 Launcher。实施保留现有产品信息架构、领域行为、路由、Command Runtime、选择合同、TaskBoard 虚拟几何、详情容器合同和 Tauri 窗口生命周期。

## User Stories

1. 作为 StoneFlow 用户，我希望所有主要界面呈现同一种冷静、低噪的桌面工作台气质，从而不再感到不同区域来自不同组件库或不同设计阶段。
2. 作为喜欢 Linear 设计理念的用户，我希望 StoneFlow 高保真继承其公开界面的层级、密度和交互关系，从而获得熟悉的高效体验，同时仍能辨认这是 StoneFlow 的独立设计。
3. 作为需要快速处理大量事项的用户，我希望任务标题、当前视图和当前操作始终拥有最高视觉权重，从而无需穿过装饰、边框和次要信息寻找工作重点。
4. 作为高频使用者，我希望界面维持约 `8/10` 的信息密度，从而在一个桌面视口内看到足够多的任务和控制项，而不会因营销页式留白降低效率。
5. 作为中文用户，我希望标题、正文、说明和元信息具有稳定、清晰的排版层级，从而既能快速扫读，也不会为了模仿拉丁字体效果牺牲中文可读性。
6. 作为浅色界面用户，我希望背景和表面使用低色度冷灰关系，从而获得冷静、克制且清晰的长时间工作体验。
7. 作为视觉敏感用户，我希望页面、导航、普通表面与浮层主要通过轻微明度、间距和必要边界区分，从而避免卡片堆叠、重阴影和重复分隔造成的噪音。
8. 作为日常用户，我希望图标小而清楚，并且只在有识别或操作价值时出现，从而不会被彩色底板和弱价值图标分散注意力。
9. 作为桌面用户，我希望 Shell、Sidebar 与主工作面保持稳定且可预测的空间关系，从而在切换页面、打开详情或调整窗口时不丢失方位感。
10. 作为导航用户，我希望 Sidebar 在视觉上后退于主内容，同时当前 Scope、当前入口和必要计数仍容易辨识，从而既能定位又不会让导航抢占注意力。
11. 作为使用鼠标和键盘导航 Sidebar 的用户，我希望 Rest、Hover、Pressed、Current、Open 与 Focus-visible 状态彼此可辨，从而能够准确理解当前所在位置和下一步操作。
12. 作为已习惯 StoneFlow Shell 行为的用户，我希望视觉重设计保留 Sidebar 的既有展开、窄栏、响应式 Sheet 与尺寸合同，从而不需要重新学习导航方式。
13. 作为跨页面工作的用户，我希望 MainCard 与 PageFrame 中同层级的 Header、Toolbar、Filter、Display 和 Body 使用一致的高度、对齐和文字层级，从而能在不同集合页沿用同一操作心智。
14. 作为使用 Filter、Display 与 View 的用户，我希望这些控制项在视觉上清楚区分当前状态、可用动作和次要操作，从而不改变它们既有的产品语义与行为。
15. 作为 TaskBoard 用户，我希望任务行保持紧凑、稳定且便于纵向扫描，从而可以快速比较标题、状态、优先级、日期和归属。
16. 作为任务列表用户，我希望 RowShell 的 Rest、Hover、Pressed、Selected、Open 和 Context-menu target 有统一视觉规则，从而不必根据不同页面猜测行状态。
17. 作为同时使用选择和键盘焦点的用户，我希望 Selected + Hover、Selected + Focus-visible 等组合状态同时保留各自信号，从而不会把选择、焦点和打开详情误认为同一状态。
18. 作为需要扫读任务元信息的用户，我希望状态、优先级、日期、Project 和 Space 信息低于标题但保持可辨，从而既减少噪音又不会隐藏决策所需信息。
19. 作为大型任务集合用户，我希望视觉重设计不破坏 TaskBoard 的虚拟滚动、分组、折叠、sticky header、分页占位和滚动定位，从而在数据量增加时仍保持现有性能与结构。
20. 作为键盘优先用户，我希望真实焦点在任务行、导航、菜单、表单和浮层中始终可见且一致，从而无需借助鼠标判断当前操作目标。
21. 作为多选用户，我希望选择视觉继续与 Command Runtime、ActionBar、右键菜单和直接快捷键使用的目标保持一致，从而不会因换肤改变操作对象。
22. 作为右键菜单用户，我希望打开 ContextMenu 不会偷偷改变现有选择，并能清楚看到本次单项目标或多选目标，从而避免对错误 Task 执行操作。
23. 作为 Command 用户，我希望搜索、分组、快捷键、当前项、禁用原因和危险动作拥有清晰而紧凑的统一层级，从而能快速定位并安全执行命令。
24. 作为 Menu 和 Popover 用户，我希望触发器的 Open 状态、浮层边界、项目 Hover、Focus-visible、Selected 与 Disabled 状态统一，从而在嵌套操作中始终知道哪个表面处于活动状态。
25. 作为 Modal、Sheet 和 Dialog 用户，我希望浮层相对底层内容有清晰但克制的层级，并保留正确的 Backdrop、Escape、外点关闭与焦点恢复，从而专注当前任务且可安全返回。
26. 作为 Task Detail 用户，我希望宽窗口 Aside、窄窗口 Sheet 和完整页共享一致视觉与同一详情状态，从而跨断点切换时不丢失 URL 意图、草稿、自动保存或列表上下文。
27. 作为设置用户，我希望 Settings 导航、分组、字段、说明和操作按钮沿用同一高密度视觉系统，从而能快速理解配置结构。
28. 作为填写表单的用户，我希望 Input、Select、Radio、Switch 等控件的 Rest、Hover、Focus-visible、Disabled、Loading、Invalid 和帮助文本状态清楚一致，从而可以可靠完成输入并理解错误。
29. 作为希望个性化界面的用户，我希望能在设置中从六个精选 Accent 里选择主题色，从而在不改变整体视觉系统的情况下获得个人偏好。
30. 作为首次使用或未设置 Accent 的用户，我希望默认看到独立校准的钴蓝方向，从而获得稳定、克制且接近所选公开参考的默认强调体验。
31. 作为尝试不同 Accent 的用户，我希望每个预设都具有完整且经过校准的 Rest、Hover、Pressed、Solid、Soft、Link 与 Focus 关系，从而不是简单替换一个孤立色值。
32. 作为单设备使用者，我希望 Accent 选择立即生效并在重启后于当前设备恢复，从而无需账户同步或每次重新设置。
33. 作为同时使用主窗口和 Launcher 的用户，我希望两个独立窗口使用同一份本机 Accent 偏好和视觉基线，从而不会像两个不同产品。
34. 作为读取到损坏或旧偏好值的用户，我希望应用安全回退默认钴蓝，从而不会出现半主题、空白控件或无法恢复的设置状态。
35. 作为依赖状态识别的用户，我希望切换 Accent 不会重染 Success、Warning、Danger 与 Info 的领域含义，从而不同主题色下仍能稳定理解业务状态。
36. 作为不能只依赖颜色识别状态的用户，我希望状态、错误、危险操作和选择同时通过文字、图标、位置或形状表达，从而在色觉差异环境中仍可理解。
37. 作为键盘和辅助技术用户，我希望正文、必要控件、交互状态与焦点提示达到相应对比度要求，从而“低噪”不会变成“低可见性”。
38. 作为使用鼠标、触控板或缩放界面的用户，我希望小图标仍拥有足够的命中区域，且常见窗口尺寸和缩放下布局保持稳定，从而高密度不会牺牲可操作性。
39. 作为对动画敏感的用户，我希望界面只保留约 `2/10` 的必要状态反馈并尊重 reduced motion，从而操作有回应但不会出现装饰性缩放、弹簧或浮动。
40. 作为明确只使用浅色界面的用户，我希望产品只呈现一套经过完整审视的 Light 视觉，从而不会看到未维护的 Dark 切换、样式分支或主题闪烁。
41. 作为遇到加载、空数据、错误或危险确认的用户，我希望这些非理想状态也使用同一视觉语言并提供明确下一步，从而不会在关键时刻退回 HeroUI 默认皮肤或模糊反馈。
42. 作为现有 StoneFlow 用户，我希望本次重设计保留 Space、Project、Task、独立事项、View、筛选、显示、详情和 Launcher 的既有信息架构与领域行为，从而这次变化是视觉系统升级而不是产品流程改写。
43. 作为维护者，我希望 HeroUI 只负责行为、结构和可访问性，StoneFlow 集中拥有语义值与公共组件皮肤，从而可以在一个明确边界内修改视觉而不触碰领域逻辑。
44. 作为维护者，我希望任一公共控件的完整状态配方只有一个全局 Owner，且用户可达表面不再暴露未经审视的 HeroUI 默认外观，从而避免 feature 私有补丁和视觉分叉重新增长。
45. 作为维护者，我希望完成迁移后删除旧 token、adapter、Dark 脚手架和零消费者兼容层，从而不会留下两条互相矛盾的视觉真相。
46. 作为 StoneFlow 的产品所有者，我希望视觉系统只借鉴 Linear 公开可见的设计理念与相对关系，从而既达到期望的风格品质，又不依赖 Linear 私有源码、资产、字体、图标或不可验证 token。

## Implementation Decisions

### 视觉目标与复刻边界

- 本次交付是一套由 StoneFlow 独立拥有的 Light-only 桌面视觉系统。Linear 只作为公开视觉关系、信息层级和交互克制程度的参照；不复制其私有源码、资产、字体或不可验证 token，也不宣称像素级复刻。
- 设计旋钮固定为：视觉差异约 `4/10`、动效约 `2/10`、信息密度约 `8/10`。这是高密度桌面生产力应用，不采用营销页构图规则。
- 主内容、当前上下文和当前操作是第一层；状态、归属、日期和计数是第二层；Sidebar 分组、未激活导航和次级图标是第三层。
- 既有低色度冷灰中性色承担大部分界面；Accent 只承担主要动作、选择、链接、Focus 与少量交互反馈，不染色基础中性色。
- 同一对象不同时依赖背景、边框和阴影三种手段争夺注意力。静态表面主要使用 spacing、明度与必要弱边界；阴影只服务 Overlay、拖拽或确需表达的 elevation。
- 现有 Inter Variable 与中文系统 UI fallback 继续作为排版基础。标题、正文、说明和元信息通过字号、字重、行高与颜色建立稳定层级，不为模仿拉丁展示字体牺牲中文可读性。
- 继续使用现有图标体系；图标视觉尺寸保持紧凑，命中目标不得随之缩小。没有领域识别缺口时不新建自有图标资产。

### Light-only 与 Accent 合同

- 只实现一个 Light 主题，不实现 Dark、不响应系统深浅色偏好，也不保留 Dark token、兼容 alias 或“以后可能用到”的空壳。
- Accent 是 Light 主题中的可选变量，不是六套完整主题。切换 Accent 不改变背景、中性色、排版、边框、阴影、密度、危险语义或领域状态含义。
- 第一版只提供六个精选 Accent，不提供任意取色器、对比度滑杆、自定义色值输入或导入主题：

| 稳定标识 | 用户名称 | 方向锚点 | 约束 |
| --- | --- | --- | --- |
| `cobalt` | 钴蓝 | `#6E78D5`，Hover 参考 `#5F6AC1` | 默认；必须按角色解决普通文字对比度 |
| `ocean` | 海洋蓝 | `#176987` | 与 Info 状态不得只靠近似蓝色区分 |
| `violet` | 烟紫 | `#72509A` | 保持低饱和，不回到旧体系的高彩紫蓝 |
| `pine` | 松柏 | `#236A61` | 向蓝绿色校准，与 Success 保持语义区分 |
| `plum` | 梅紫 | `#864A75` | 与 Danger 保持足够色相与形状区分 |
| `graphite` | 石墨 | `#4C5966` | 保证交互状态仍明显高于中性色 |

- 表中数值是已确认 Demo 的方向锚点，不代表一个值直接复用所有状态。每个预设都必须在唯一语义主题层提供 Base、Solid、Foreground、Hover、Pressed、Soft、Soft foreground、Soft hover、Link、Border 与 Focus 等真实消费角色；不创建无消费者的完整色阶。
- 用户观察到的 `#6E78D5` 与 `#5F6AC1` 是 StoneFlow 自主采用的视觉锚点，不表述为 Linear 官方、固定或已验证 token。
- `#6E78D5` 配白色约为 `3.95:1`，不满足普通字号文字 `4.5:1`。它可以用于满足 `3:1` 的非文本边界、选择指示或其他图形角色，但不得直接成为小字号白字主按钮的背景。钴蓝的文字型 Solid、Link 与 Foreground 必须独立校准；不得为了保留锚点接受不合规组合。
- 其余五个 Accent 遵循相同角色合同，不使用运行时颜色生成器。TypeScript 只拥有稳定预设标识、合法值校验和设置文案，不镜像颜色 token。
- Success、Warning、Danger 与 Info 的语义和调色不随 Accent 切换。若 Accent 与状态色接近，状态必须同时通过文字、图标、位置或形状表达；状态色可在全局统一校准一次，但不能为每个预设分叉。

### Appearance Preference

- 主题色选择位于“通用”设置中的独立区域，不为一个选项新增完整“外观”分区。
- 选择器使用可访问的单选集合语义，同时显示色样和文字名称；支持键盘方向键、明确的选中态与 Focus-visible。
- Appearance Preference 是 Renderer 自有的小型本机偏好，复用现有 Web Storage 合同及其当前会话回退能力。偏好只保存稳定预设标识，不进入 Rust 设置表、SQLite、同步领域或远端副本。
- 读取到缺失、损坏或未知标识时统一回退 `cobalt`。不建立迁移框架、旧值兼容别名或版本化 schema；下一次合法选择自然覆盖异常值。
- Main 与 Launcher 是独立渲染根，但共享同一个 Appearance Preference 解析和应用合同。两个入口均在 React 挂载前应用已保存值；Main 的设置变更立即应用，Launcher 在启动及每次呈现前重新读取，避免依赖额外后端同步通道。
- Accent 只通过根元素上的稳定 `data-accent` 状态选择语义变量。组件和 feature 不根据预设标识增加 React 条件分支。
- 静态开屏与原生窗口背景保持中性，因此 Accent 变化不要求修改原生窗口背景；真实内容出现前必须已应用正确的 `data-accent`，不得先渲染默认 Accent 再闪到保存值。

### 视觉所有权与依赖方向

- HeroUI OSS/Pro 继续拥有组件结构、行为、键盘交互、Focus 管理、Overlay 语义和可访问性。StoneFlow 拥有全部视觉结果；所有用户可达表面都必须经过审视，不允许继续泄漏 HeroUI 默认皮肤。
- 语义主题层是唯一视觉值源，负责 Light 中性色、六组 Accent、固定状态色、Focus、Link、Surface、Border、Shadow 和必要的 Tailwind 语义桥接。
- 公共组件 recipe 层是唯一 HeroUI OSS/Pro BEM、modifier 与 data-state 皮肤，负责通用控件的完整视觉状态；其中不得散落独立原始颜色。
- 产品组件只保留稳定结构、产品语义和必要动态几何。Feature 不定义通用 Button、Menu、List、Field、Modal 或 Sheet 的私有皮肤，不复制公共 recipe。
- 同一语义只允许一个 token，同一公共组件状态只允许一个 recipe。迁移完成后删除旧 primitive/semantic/layout token 链、Dark 扩展、shadcn adapter、页面私有补丁和零消费者兼容层，不保留双轨真相。
- 不创建一对一 HeroUI wrapper、TypeScript token 镜像、独立 design-system package、第二套 variant runtime、Storybook 或页面级主题。
- 不引入新依赖。继续使用 HeroUI OSS/Pro、Tailwind CSS v4 与当前字体、图标和测试工具。

### 代表性表面与状态矩阵

- 先完成最少的代表性表面，再横切公共规则；不得按 feature 页面逐个堆补丁。代表性表面为：Shell/Sidebar、MainCard/PageFrame、TaskBoard/RowShell、Command/Menu/Popover、Modal/Sheet/Detail、Settings/Form 与 Launcher。
- 每类交互组件至少审视 Rest、Hover、Pressed、Selected、Selected + Hover、Focus-visible、Selected + Focus-visible、Open/Expanded、Disabled、Loading、Invalid/Danger 与 Context-menu target；有拖拽能力时再覆盖 Drag/Drop target。
- Focus-visible 只在键盘或辅助输入需要时出现；指针 Hover 不伪装成 Focus。Selected、Open 与 Focus 是三个独立维度，组合状态必须同时保留必要信号。
- Filled 强调只给当前决策上下文中的主要动作；同级次要动作保持中性。Accent-colored text 只用于真实可交互链接或状态，不用于静态装饰标题。
- Sidebar 后退于 Main，但当前 Scope、当前导航和必要计数保持清晰。较小图标不意味着较小命中目标。
- MainCard/PageFrame 的 Header、Toolbar、Filter、Display 与 Body 在不同集合页共享高度、对齐、文字等级与控制位置。
- TaskBoard/RowShell 保留现有任务行、分组标题与虚拟集合几何；视觉状态不得改变测量高度、sticky、分页占位、滚动定位或 collection 合同。
- Command/Menu/Popover 统一搜索、分组、当前项、快捷键、危险动作、Overlay 边界和触发器 Open 状态；ContextMenu 打开不得偷偷改变现有选择。
- Modal/Sheet/Detail 统一 Header、Body、Footer、Backdrop、边界和 elevation；Task Detail 的 Aside/Sheet 只换容器，不改变 URL、草稿、自动保存或详情状态。
- Settings/Form 统一 Label、Description、Input、Select、Radio、Switch、Validation、Disabled 与帮助文本。Launcher 复用同一语义值和公共 recipe，不建立独立皮肤。

### 产品行为与架构文档

- 保留现有 Space、Project、Task、独立事项、View、Filter、Display、Command Runtime、选择目标、ActionBar、Task Detail、Launcher 与同步领域行为。
- 保留现有 Shell 响应式合同、Task Detail 的 Aside/Sheet 断点、TaskBoard 容器查询与 Tauri 窗口生命周期。本任务只新增主题色选择这一项设置行为。
- 继续遵守“不新增 StoneFlow 第一方动效”的平台决定；不引入 Motion、CSS animation 或新的 duration/easing 系统。
- 当前 HeroUI ADR 中“HeroUI 管理标准组件视觉”的条款与本次“StoneFlow 完整拥有视觉”冲突。实施必须显式修订为“HeroUI 管理行为、结构与可访问性；StoneFlow 管理视觉”，同时保留 HeroUI 作为唯一 UI 行为平台的决定。
- 现有界面系统与样式架构文档仍包含旧 token、shadcn adapter、Dark 扩展和旧样式所有权描述。完成 hard cut 时必须同步更新为“语义主题 → 公共组件 recipe → 产品消费者”的单向合同。

## Testing Decisions

- 测试只验证用户可观察行为与公开合同，不锁定内部 helper、组件层级、className 拼接或具体实现调用次数。视觉数值只从 CSS 唯一真相源读取，不在测试中复制 TypeScript 调色板。
- 最高自动化 seam 复用真实 SettingsPage DOM 集成测试：用户在“通用 → 主题色”选择非默认预设后，可访问单选状态正确，根元素 Accent 立即变化，本机值被保存，重新挂载后仍恢复选择。
- 唯一新增的低层 seam 是共享 Appearance Preference/Bootstrap DOM 单元测试：表驱动覆盖六个合法标识、缺失值、损坏 JSON、未知标识、默认回退、React 挂载前应用，以及需要的订阅或呈现前重读清理合同。Web Storage 被拒绝时的会话回退复用现有通用测试，不重复测试。
- 扩展现有 Shell Theme Sync 静态检查，保证静态 HTML、Light 主题、Main 入口与 Launcher 入口使用同一默认 `data-accent`，并在 React 挂载前消费共享 Bootstrap 合同。不得为两个入口复制完整逻辑测试。
- Launcher 现有页面集成 seam 只增加最小断言，证明每次呈现前重新取得当前 Accent；不复制 SettingsPage 测试。
- 现有 RowShell、TaskBoard、Command、ContextMenu、Detail、Settings 与 Launcher 行为测试继续保护键盘、Focus、Selection、Overlay、URL、虚拟化与生命周期，不把视觉重设计伪装成行为重写。
- jsdom 不计算真实 CSS，class snapshot 也不能证明视觉质量，因此不新增 className snapshot、Storybook 或截图回归基础设施。
- 每个 Accent 的最终语义角色都必须对实际渲染配对执行一次对比度审计：普通文字至少 `4.5:1`，大文字与关键非文本控件、选中边界和 Focus 指示至少 `3:1`。审计直接针对唯一 CSS 值源，不建立平行 token 数据。
- 默认钴蓝在完整代表性状态矩阵上验收：Shell/Sidebar、MainCard/PageFrame、TaskBoard/RowShell、Command/Menu/Popover、Modal/Sheet/Detail、Settings/Form 与 Launcher。
- 其余五个 Accent 只横向抽查真正受 Accent 影响的角色：主要动作、Selected/Soft、Link、Focus，以及与固定 Info/Success/Warning/Danger 的区分；不重复完整页面验收。
- 最小真实应用 Smoke：冷启动 Main、打开 Launcher、切换一次非默认 Accent、再次打开 Launcher、重启应用并确认两处一致；同时检查没有默认 Accent 闪烁。未执行该 Smoke 时不得宣称 Tauri 或视觉验收通过。
- 静态与自动化门禁至少包括类型检查、Lint、模块边界、格式检查、第一方动效扫描、相关 DOM/单元测试、Shell Theme Sync 脚本测试和生产构建。没有 Rust 改动时不为本任务新增 Rust 测试。

## Out of Scope

- 暗色模式、暗色切换、暗色 token、`dark:` 分支以及为未来暗色模式预留的运行时或兼容脚手架。
- 任意取色器、用户输入任意色值、完整主题编辑器，以及对 base color、contrast、字体、密度或圆角的用户自定义。
- Accent 跨设备同步、账户级偏好、后端字段、同步协议或云端配置；本次偏好只属于当前设备。
- 用 Accent 重染冷灰中性色或按预设分别重映射 Info、Success、Warning、Danger。
- StoneFlow Logo、应用图标、命名、品牌资产或完整品牌识别重设计；Logo 与 UI Accent 不建立绑定关系。
- 复制、反编译或依赖 Linear 的私有源码、StyleX bundle、内部 token、Figma 文件、字体、图标或品牌资产；也不宣称用户提供的颜色参考是 Linear 官方 token。
- 对 Linear 做不可验证的逐像素复制；公开界面只作为相对层级、关系与少量几何参照。
- 改变现有产品信息架构、领域模型、路由合同、筛选与显示语义、Command Runtime、选择目标、Task Detail 状态、自动保存或 Launcher 生命周期。
- 以本次视觉任务重写 TaskBoard 的虚拟化、分组、sticky、分页、滚动几何或性能模型。
- 替换 HeroUI OSS/Pro、进入完全 headless 模式，或由 StoneFlow 重写标准组件的键盘、Overlay、ARIA 与 Focus 管理。
- 引入 Motion、Framer Motion、StoneFlow 第一方动画运行时、自定义 easing/duration 系统或装饰性动画。
- 建立一对一 HeroUI wrapper、TypeScript token 镜像、独立 design-system package、Storybook、页面私有皮肤、兼容 alias 或第二套 variant runtime。
- 新增与视觉系统无关的产品能力、设置项或导航入口。
- 按 feature 页面逐个打补丁；本次只接受代表性表面验证后基于共享语义与公共组件 recipe 的横切落地。

## Further Notes

- 六色 Demo 表示方向已接受，不等于一个原始值可以填入所有组件状态。后续只允许为对比度、状态区分和跨表面一致性微调各语义角色，不借机扩展为完整主题系统。
- 默认色应表述为“StoneFlow 独立定义、参考用户观察到的 Linear 钴蓝关系”，不得写成“Linear 官方默认钴蓝”。
- Logo 与 Accent 没有绑定关系；Logo 可在独立任务中重新设计，本任务不以现有 Logo 颜色决定主题色。
- 已确认不需要跨设备同步。本机偏好不会参与账号、数据库、云同步、导入导出或备份恢复。
- 本任务是 Light-only 的视觉 hard cut；“未来也许增加 Dark”不是保留旧 Dark 层或双轨兼容代码的理由。
- 视觉原型和状态矩阵是实施证据，不是新的长期 design-system package。最终长期所有者仍只有语义主题层与公共组件 recipe 层。
- 本规格取代此前关于 StoneFlow 视觉值源、HeroUI 默认皮肤和 Dark 预留的冲突描述，但不取代既有领域模型、系统设计、界面行为或 Task Detail/TaskBoard 几何合同。
