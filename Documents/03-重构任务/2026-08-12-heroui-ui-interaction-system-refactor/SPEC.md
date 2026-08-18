# HeroUI-only UI 平台、Linear 浅色设计系统与键盘交互重写 - Spec

## 背景与目标

StoneFlow 已具备较完整的桌面产品能力，但 UI 实现形成了多条并行路径：shadcn/Radix、StoneFlow base wrapper、pattern class、`--sf-*` token、feature 局部样式以及多套列表焦点/选择逻辑相互穿透。继续在旧架构上换 primitive，只会保留大部分长期维护成本。

本任务允许破坏性重构，终态目标是：

1. **完整切换到 HeroUI OSS + HeroUI Pro**：标准控件、表单、导航、浮层和已有高级表面均以 HeroUI 为 UI 平台，不长期保留 shadcn、Radix 或 cmdk 双轨。
2. **重建而非映射旧样式系统**：保留 Tailwind CSS v4，但删除旧 token、adapter、pattern class 和 feature 私有皮肤，以 HeroUI semantic theme 作为唯一 UI 视觉真相。
3. **独立实现 Linear-inspired Light 视觉**：参考 Linear 官方设计说明、公开渲染结果、任务发起人提供的当前界面截图和实测取色，形成 StoneFlow 自有主题；不复制或依赖 Linear 私有 StyleX token、源码或品牌资产。
4. **重写键盘、焦点与选择交互**：删除当前混乱的重复状态机，以 React Aria collection 语义和 StoneFlow 产品键位合同对齐 Linear 的键盘优先体验。
5. **保留产品与桌面契约**：Command、业务选择快照、TaskBoard 虚拟几何、路由详情、自动保存、Tauri 窗口和 Launcher 生命周期仍由 StoneFlow 拥有。
6. **减少而不是转移复杂度**：不为 HeroUI 逐个建立同名 wrapper，不再创建第二套 design token 或兼容层；只为 Shell、TaskBoard、Command 等真实产品语义保留组合组件。
7. **清零第一方动画**：本任务不引入 Motion，也不重写新动效；删除 StoneFlow 自有动画、过渡、平滑滚动和旧动画依赖，HeroUI OSS/Pro 自带动效按官方实现保留。

一句话：**HeroUI 负责标准 UI 与标准交互，StoneFlow 只负责产品语义、桌面壳和无法由通用组件表达的动态几何。**

## 范围

### 1. HeroUI-only UI 平台

- 将所有用户可达的标准控件、表单、导航、菜单、浮层和反馈表面迁移到 HeroUI OSS 或 HeroUI Pro。
- 优先使用 HeroUI 已提供的高级组件复现现有能力，包括 Sidebar、Resizable、Sheet、Command、ContextMenu、ActionBar、Timeline、集合组件及其他真实匹配的组件。
- HeroUI 已提供对应能力时，不保留只透传 props、复制 slots 或复刻 variants 的 StoneFlow 同名 wrapper。
- 只有稳定产品语义、跨表面业务编排或明确的桌面/虚拟化边界才允许保留 StoneFlow 产品组件。
- 终态删除 Radix、shadcn、cmdk、旧 base primitive、旧 DOM adapter、无消费者的兼容逻辑及其实现细节测试。

### 2. Tailwind 与全局样式重建

- 保留 Tailwind CSS v4，作为 HeroUI 原生样式体系和产品布局、响应式、尺寸、溢出等组合工具；不引入 StyleX。
- 以一套 HeroUI semantic theme 表达背景、表面、文字、边界、强调色、焦点和状态色；不再保留“StoneFlow token → HeroUI token”双层映射。
- 全局样式只承担样式入口、HeroUI 主题、真正的 document/root 规则、字体、Tauri 平台规则和极少数跨组件 utility。
- feature 可以使用 Tailwind 表达结构和布局，但不得局部重画 Button、Input、Menu、Dialog 等通用组件的颜色、圆角、阴影、hover、focus 或 disabled 皮肤。
- 允许局部保留的样式仅限：虚拟化坐标与高度、拖拽动态尺寸、Tauri/Launcher 原生窗口几何、业务实体数据色和运行时进度值。
- 删除旧 `--sf-*` UI token、shadcn adapter、dark scaffold、纯 class-string pattern 导出以及重复的 radius/shadow/type scale。

### 3. 第一方动画清零

- StoneFlow 应用源码不直接 import、调用或封装 `motion`、`framer-motion` 或其他动画运行时，也不预埋 animation wrapper、provider、token 或时间曲线；如果锁定版 HeroUI 官方安装合同要求某个动画 peer/direct dependency，则可精确锁定为供应商实现依赖，但 StoneFlow 不消费其 API。
- 删除 StoneFlow 对 `tw-animate-css` 的直接依赖、直接 import 和应用层调用；如果锁定版 `@heroui/styles` 仍将其作为传递依赖，`bun.lock` 只允许这条 HeroUI 官方依赖链，不把传递依赖误报为 StoneFlow 自有动画。
- StoneFlow 生产源码不得保留自有 `@keyframes`、CSS `animation`/`transition`、Tailwind `animate-*`/`transition-*`/`duration-*`/`delay-*`/`ease-*`/`motion-*`、按压缩放、平滑滚动、Web Animations API 或 View Transition API。
- HeroUI OSS/Pro 官方样式自带的进入、退出、按压、折叠、Spinner、Progress 等动效照常保留；StoneFlow 不复制、不改写其 keyframe、duration 或 easing，也不设置全局 `data-reduce-motion="true"` 强制关闭。
- 系统启用“减少动态效果”时，使用 HeroUI 官方 `prefers-reduced-motion` 合同；锁定版的关键组件必须实测，不为潜在问题预先添加散落兼容 CSS。
- “第一方零动画”不等于删除行为：Sidebar 拖宽、TaskBoard 虚拟坐标、滚动条同步、运行时进度值和焦点恢复仍即时更新。`requestAnimationFrame` 只可用于焦点、滚动、布局和 DOM 写入批处理，不得用于 StoneFlow 自建插值、补间或视觉 tween。
- Loading、同步、更新和提交状态必须保留可读文字、ARIA 状态和确定进度；不得依赖旋转、脉冲或渐变动画作为唯一反馈。
- 未来若需要 Motion，另立独立任务重新定义动效原则、组件范围、reduced-motion 和性能预算；不属于本次 HeroUI 迁移。

### 4. Linear-inspired 浅色视觉、色彩合同与字体

- 视觉方向采用低彩度、清脆的近中性灰：Sidebar 与外壳后退，近白主工作面成为第一层级，边界柔和，阴影只服务浮层。不得再把这套已确认色板描述为待选“暖灰候选”。
- 以下基础色是浅色主题的已确认视觉合同；实现时直接映射到 HeroUI semantic theme，不建立 `StoneFlow token → HeroUI token` 中间层。

| 语义角色 | 色值 | 使用边界 |
|---|---:|---|
| `foreground` | `#303032` | 主工作区正文、标题和普通强调文字 |
| `foreground-muted` | `#5a5a5c` | Header、Sidebar、说明文字和次级信息 |
| `foreground-strong` | `#1b1b1b` | Active/Pressed/Open 等最强交互文字，不作为普通正文色 |
| `shell` | `#f3f3f4` | Header、Sidebar、Footer 与主工作面之外的壳背景 |
| `main` | `#fcfcfd` | 主工作区背景 |
| `surface-raised` | `#ffffff` | Button、Popover、Menu、Sheet 等抬升表面 |
| `main-hover` | `#f6f6f7` | 主工作区行与内容项 Hover |
| `shell-hover` | `#ebebec` | Sidebar 等壳层高频入口 Hover |
| `shell-active` | `#e5e5e6` | Sidebar Active/Current 表面 |
| `accent` | `#5e6ad2` | 主要动作与品牌强调 |

- 以下组件状态配方同样属于全局视觉合同，由 HeroUI theme/BEM 组件层统一实现；feature 不得重复硬编码。

| 组件或区域 | 默认 | Hover | Active / Pressed / Open |
|---|---|---|---|
| Header 背景 | `#f3f3f4` | `#e4e4e5` | 按具体控件采用全局 Active 配方 |
| Sidebar 背景 | `#f3f3f4` | `#ebebec` | `#e5e5e6` |
| Main 背景 | `#fcfcfd`、文字 `#303032` | `#f6f6f7` | 选中状态使用独立 Accent selection 语义 |
| Raised Button 背景 | `#ffffff` | `#f7f7f7` | 按对应 Button variant 的 Active 配方 |
| Outline Button | 背景 `#ffffff`；边框 `#dbdbdb`；文字 `#5d5d5f` | 背景 `#f3f3f4`；边框 `#cccccc`；文字 `#303032` | 背景 `#efeff0`；边框 `#d6d6d7`；文字 `#1b1b1b` |

- 本表中的 `Active` 指按钮按下、保持 pressed、展开或 open 后的交互状态，不等于键盘 `focus-visible`。标准控件沿用 HeroUI 焦点配方；TaskBoard 行状态只以第 7 节矩阵为准。Selected/Current 不得借用焦点状态冒充。
- `#2e2f30` 不进入最终主题；粗体继续使用 `#303032`，通过真实字重表达强调。近似色可以在 HeroUI 内部保留为组件配方，但不得扩张成 feature 级 token 或编号灰阶。
- 已验证的主要文字组合均满足 WCAG AA：`#5a5a5c / #f3f3f4` 为 `6.21:1`，`#303032 / #fcfcfd` 为 `12.85:1`，Outline 默认文字 `#5d5d5f / #ffffff` 为 `6.57:1`。
- 中性边框的对比度约为 `1.26–1.45:1`，只允许承担克制的装饰与分层；如果控件必须依赖可见边界才能被识别，则还必须通过标签、表面、阴影或更强边界提供足够信息。任何可聚焦控件都不得仅依赖这些中性边框表达焦点。
- 保留现有紫蓝 Accent，以及现有 success、warning、danger、info 与业务实体数据色；它们分别映射到 HeroUI semantic status 或产品数据色，不从中性灰自动派生。
- Hover、Active/Pressed、Selected/Current 与 Focus-visible 必须可区分；状态色保持低饱和，可用于图标、文字、圆点、Badge、Alert、Toast 等语义反馈，不使用大面积高饱和填充。
- [HeroUI 浅色预览](../../99-素材/02-HTML原型/stoneflow_heroui_light_v1.html) 当前只作为布局、组件与交互评审材料；在其颜色同步到本表之前，不得将其作为色彩真相。任务发起人提供的当前 Linear 截图只作为方向参考，旧 StoneFlow 截图只用于记录功能与特殊细节。
- 本节色值表和对比度结果是颜色实现与回归的 Owner；实施完成后仍需补充新版 StoneFlow 关键页面截图，验证主题映射没有改变已确认层级。
- 拉丁字符与数字采用本地打包的 **Inter Variable**，开启 optical sizing；中文使用 macOS/Windows 系统中文 fallback，不再用 Maple Mono + 霞鹜文楷承担全局 UI 字体。
- 正文以真实的 400/500 字重为主，强调使用 600；代码、快捷键和确有等宽语义的数据才使用系统 monospace。
- 本轮只交付浅色主题，清除旧 `dark:` 分支和未维护的暗色 token。

### 5. Sidebar 三态与 Inset 桌面壳

- `>=1024px` 时，Sidebar 有两个持久桌面状态：展开宽栏和 `48px` icon rail 窄栏。
- 展开宽栏首次默认 `256px`，允许在 `220px–330px` 内拖拽调整；窄栏恢复展开时回到上一次已提交宽度。
- 同一伸缩控制区支持“点按切换宽/窄”和“拖动调整展开宽度”，并提供等价键盘操作、可访问名称、当前值和状态反馈。
- `<1024px` 时进入第三个有效状态：Sidebar 从布局中完全隐藏，通过覆盖式 Sheet 打开同一套导航与业务操作；响应式隐藏不得覆盖已保存的桌面宽/窄偏好和展开宽度。
- 桌面不额外增加“完全隐藏”第四种持久模式，避免与窄栏、移动 Sheet 和快捷键状态产生不必要分叉。
- 采用 Inset 视觉结果：灰色导航壳包围单一近白主工作面，保持 8px gutter、柔和圆角和极弱边界，不出现双层 inset 或双重阴影。
- 保留 Space/项目/设置导航、badge、路由、危险操作确认、Tauri drag region、窗口控制、Header、Footer、启动骨架和断点切换无闪烁契约。
- “宽栏可拖拽 + icon rail”是 StoneFlow 对 HeroUI Sidebar、Resizable 与 Sheet 的薄产品编排；不得伪称为 HeroUI 单个配置，也不得因此重建一套通用 Sidebar primitive。

### 6. 任务详情 Aside、Sheet、完整页与 Peek

- Space Peek 是快速只读预览；正式详情由同一个 `?task=` URL 意图驱动，在 Aside 或 Sheet 中可编辑并自动保存。canonical 完整页只由明确的“打开完整页”动作进入，不参与响应式分流。
- 没有 active task 时，MainCard 只渲染任务列表。从列表点击任务或按 `Enter` 时，所有宽度都只写入共享 `?task=` 详情意图。
- 窗口宽度 `>=1024px` 时，在 Main surface 内以 HeroUI Pro Resizable 打开非模态 Aside；列表 Panel 最小 `352px`，Aside 最小 `320px`、默认 `360px`、最大 `440px`。Aside 宽度只在会话内拖动，不使用 overlay 或 focus trap。
- 窗口宽度 `<1024px` 时，以 HeroUI Sheet 渲染同一份详情内容；Sheet 使用 HeroUI 标准模态、Backdrop、Escape、外点关闭与焦点管理语义。
- 窗口跨越 `1024px` 时只在 Aside 与 Sheet 之间替换容器；保留同一 `?task=`、任务 ID、草稿与 autosave controller，不关闭详情、不改写 history、不自动进入完整页。Shell 只派生一份 `isCompact` 供 Sidebar 与详情消费；两者的 open state 独立，窄窗两张模态 Sheet 必须互斥。
- Aside 与 Sheet 共用同一详情领域能力和 Header；Header 保留“打开完整页”动作，必须先 flush 当前草稿再导航。详情查询、表单模型、领域 mutation、确认和错误处理仍由现有 feature/application 边界拥有。

### 7. 键盘、焦点、选择与命令重写

- 普通集合与 TaskBoard 使用同一份产品交互合同，不并行维护第二份 current key、selected state 或多套 Shift 会话。
- pointer hover 与键盘导航共享唯一 current key；pointer 进入行时该行成为 current，移出 pointer-owned current 时清空行 current 并把键盘入口留在 collection root。交互来源只决定视觉：pointer 无边框，键盘接管后显示细边框，不产生第二份焦点真相。
- 行表面只由 `selected × current source` 决定，不让详情、Peek 或菜单再创建第七种“active”颜色：

  | Selection | Current source | 表面 | 边框 |
  |---|---|---|---|
  | 未选 | 无 | 透明 | 无 |
  | 未选 | Pointer | 中性灰 hover | 无 |
  | 未选 | Keyboard | 中性灰 hover | `1px` 较浅中性边框 |
  | 已选 | 无 | 浅蓝 selected | 无 |
  | 已选 | Pointer | 更深、低饱和的灰蓝 | 无 |
  | 已选 | Keyboard | 更深、低饱和的灰蓝 | `1px` 较浅中性边框 |

- 键盘边框只属于真实 `:focus-visible` 行，不属于 collection root 或逻辑 current；浅色表面上的边框仍保持至少 `3:1` 的非文本对比。Pointer 聚焦、右键和普通点击不得显示边框。
- ContextMenu 打开不改变 selection：已选触发行继续使用 selection 目标和灰蓝表面，未选触发行只作为本次单项目标并使用普通灰 hover；菜单本身不增加行状态。
- Detail 与非模态 Space Peek 不增加专用行颜色，也不独立锁定 current；pointer 仍在移出时清空，键盘触发项关闭后若虚拟行卸载，则按 stable task id 滚动、重挂并恢复真实焦点；实体不存在时回退集合根，集合已为空时回退空态主操作。
- Pending 只叠加透明度与禁用 mutation 控件；连续选择只改变首/中/尾圆角与间隙底色；done/canceled 只叠加弱化文字与删除线。这些修饰不得改写六种核心表面。
- 有 current 时，`↑/↓`、`J/K` 与 `Home/End` 从该项移动真实焦点并将目标滚入视野；collection root 有焦点但没有行 current 时，向下/Home 从首项、向上/End 从末项建立键盘 current。
- `X` 切换当前焦点项；`Shift+方向键` 从固定 anchor 扩展或收缩连续范围。
- `Space` 只控制 Peek，`Enter` 写入 `?task=` 并按窗口 `1024px` 边界打开 Aside 或 Sheet；关闭正式详情后恢复原集合焦点。
- `Cmd/Ctrl+A` 在 collection root 或行拥有真实焦点时选择按键时当前视图中已经加载且可操作的项目，不要求预先存在行 current；之后增量加载的项目不自动加入。查询级“包含尚未加载结果的全选”不在本 UI 重构内隐式引入。
- 右键不改变 selection，也不增加选中边框：右键已选项时以整个 selection 为目标，右键未选项时仅以该项为目标，并保持普通 pointer hover 表面。
- Escape 按“输入法/编辑 → 当前 Menu/Dialog/Sheet → Detail Aside → Peek → Selection → 页面”的固定优先级消费。
- 输入框、编辑器、contenteditable 或 IME 接收输入时，字符快捷键不得触发产品命令。
- Command Palette、Context Menu、ActionBar、行操作与直接快捷键继续共享 Command Registry/Runtime 的可用性、目标快照、disabled reason 和执行入口。

### 8. TaskBoard 与集合边界

- 保留 TaskBoard 的分组、折叠、sticky header 顶替、TanStack Virtual、服务端总高度占位、无限加载和外部 `scrollToTaskId`。
- 任务列表只保留一档容器自适应：列表容器宽度 `<560px` 时进入紧凑行布局，否则使用标准行布局。该判定使用 CSS container query，不新增 JS 宽度状态或多档回退。
- 重写 TaskBoard 行的真实 collection 语义、焦点、选择与键盘行为，删除旧重复状态机。
- 虚拟目标尚未挂载时，先滚动并挂载再恢复焦点；实体消失时回退到确定的相邻项或集合根。
- 选择按稳定实体 ID 跨虚拟卸载与分组折叠保留；实体删除时移除对应选择，筛选或查询变化时与新可操作集合取交集，增量加载的新项目不自动加入；多选视觉继续正确表达单项、首、中、尾。
- 普通平面集合优先使用 HeroUI 高层集合能力；TaskBoard 不为了组件统一牺牲特殊几何、性能或分组行为。
- 直接使用 React Aria 只允许承接 HeroUI 高层集合无法表达的 TaskBoard/collection 行为，不得借此重建视觉 primitive。

### 9. 现有表面迁移与体验优化

- 使用 HeroUI Pro Command 替换命令面板的输入、列表、分组、Dialog 与焦点表面，保留 StoneFlow 命令模型和异步搜索。
- 使用 HeroUI Pro ContextMenu 替换标准触发、菜单焦点和子菜单，保留领域动作与目标解析。
- 使用 HeroUI Pro ActionBar 替换批量操作视觉与 toolbar 语义，保留 selection snapshot、确认、mutation 和反馈。
- 使用 HeroUI Pro Timeline 替换活动历史 chronology 布局，保留查询、订阅和领域 display model。
- 迁移表单、Filter、Display Options、Metadata、Settings、创建/编辑、更新、Changelog、About、Global Search 和 Launcher 等全部现有用户可达表面。
- 不为了“用上所有 HeroUI 组件”新增没有产品需求的 Kanban、DataGrid、Agenda、图表或模板；组件只在真实替代现有能力时采用。

### 10. 工程、验证与文档收口

- 主窗口和 Launcher 共用同一套 HeroUI theme 与基础样式，同时保持各自独立入口、窗口透明度和生命周期。
- 重写只断言 Radix/shadcn/cmdk DOM 的测试，保留并增强产品行为、可访问性和焦点测试。
- 本任务只在真实 macOS WKWebView 验收 Sidebar、详情承载、完整键盘表、焦点恢复、嵌套浮层和关键视觉截图。Windows 构建、平台分支与产品支持继续保留，但本任务不采集 Windows WebView2 证据、不以 Windows 设备为阻塞，也不宣称 Windows 已验证。
- HeroUI Pro 固定通过 CollectUI `hpsetup@4.7.0` 获取锁定版本，Key 只经进程环境或 secret store 注入；干净环境可重复安装与构建，仓库、日志与应用产物不得包含 Key 或私有源码。
- 实施落地后同步 PLAN 登记的长期文档。

## 不做什么

1. 不引入 StyleX，不并行维护 Tailwind 与 StyleX。
2. 不实现暗色主题，不保留会产生“看似支持、实际未维护”结果的旧 dark scaffold。
3. 不在本任务引入 Motion、Framer Motion 或重新设计任何新动画；未来动效设计另立任务。
4. 不复制、反编译或依赖 Linear 的私有 StyleX bundle、内部 token、Figma 文件或品牌资产；也不把独立实现称为 Linear 官方色板。
5. 不为了组件覆盖率新增 Kanban、DataGrid、Agenda、图表或其他新产品功能。
6. 不重构后端、数据库、同步协议、领域模型或业务 mutation 规则；查询级全选等需要后端语义的新能力另立任务。
7. 不保留 Radix/shadcn 与 HeroUI 的长期兼容层、双实现开关或灰度路径。
8. 不把 TaskBoard 虚拟几何、Command Runtime、业务 selection snapshot、路由详情或 Tauri 生命周期交给组件库。
9. 不要求旧 StoneFlow 界面像素保真；旧界面只用于防止现有功能和特殊桌面细节遗漏。
10. 不把 HeroUI Pro 私有组件源码或解包资产作为源码、库或下载物再分发。
11. 不取消 Windows 构建、平台分支或产品支持，也不为本任务未实测的 Windows 行为新增专门兼容层；Windows WebView2 验收另行安排。
12. 不在本任务整体重构 MainCard、TaskBoard 虚拟列表或焦点渲染性能；现有 fixture 与迁移前基线仅保留给独立后续任务重新基线，不作为本轮完成门。

## 用户场景与需求

- 作为键盘优先用户，我想用稳定一致的键位完成导航、聚焦、多选、Peek、打开详情和执行命令，而不必猜测当前由哪套状态机接管。
- 作为多选用户，我想让 Command、右键菜单、ActionBar 和直接快捷键始终作用于同一批目标，避免不同入口产生不同结果。
- 作为 TaskBoard 用户，我想在大数据、分组折叠、虚拟滚动和增量加载下仍获得真实焦点、可预测选择和流畅滚动。
- 作为桌面用户，我想在宽窗口点按控制区切换宽栏与窄栏、拖动宽栏调整空间，在窄窗口让 Sidebar 完全让出工作区。
- 作为任务编辑用户，我想在宽窗口使用可拖宽 Aside 连续查看和编辑，在窄窗口使用 Sheet 保持当前列表上下文，而不需要管理呈现偏好。
- 作为视觉用户，我想获得接近当前 Linear 的近中性灰、低噪音、高密度浅色体验，但仍保留 StoneFlow 自己的 Accent 和产品身份。
- 作为减少视觉噪音的用户，我想让产品只使用 HeroUI 一致的标准动效，不再叠加 StoneFlow 各 feature 自写的旋转、脉冲、缩放和过渡。
- 作为跨平台用户，我想让 macOS 与 Windows 都保留原生窗口习惯、清晰焦点、正确快捷键和无闪烁启动体验。
- 作为维护者，我想只维护一套 UI 平台、一套 semantic theme 和一套焦点/选择合同，让我和 AI 能低成本修改和删除代码。

## 能力边界

| 能力 | 唯一职责与边界 |
|---|---|
| HeroUI OSS / Pro | 标准组件、React Aria 行为、焦点、浮层和高级 UI 表面；不拥有 StoneFlow 业务状态 |
| HeroUI semantic theme | UI 背景、表面、文字、边界、强调色、焦点和状态色的唯一视觉真相；不再向旧 `--sf-*` token 映射 |
| Tailwind CSS v4 | 产品结构、布局、尺寸、响应式和少量语义 utility；不建立第二套组件皮肤或 token 系统 |
| 第一方零动画合同 | 应用源码零自建动画，HeroUI 官方动效为唯一组件动效来源；不删除焦点、滚动和虚拟几何调度 |
| StoneFlow 产品组件 | Shell、TaskBoard、Command、详情等稳定产品契约；不镜像 HeroUI primitive API |
| Shell 响应式状态 | 只拥有宽/窄/响应式隐藏、宽度与导航壳的唯一 `1024px` 断点；不决定详情呈现 |
| React Aria collection | 集合语义、真实焦点与标准选择基础；StoneFlow 只适配 Linear 键位和业务目标 |
| Command Registry / Runtime | 快捷键目录、可用性、目标解析、disabled reason 和执行的唯一真相；UI 只是投影 |
| Selection / Bulk snapshot | 将集合选择转成领域操作目标；不与 collection 并行维护第二份选择状态 |
| TanStack Virtual / TaskBoard model | 虚拟几何、sticky、总高度、分页和滚动定位；不再拥有重复焦点状态机 |
| Detail route / feature model | URL search 拥有列表详情意图，Detail Host 只按窗口 `1024px` 边界派生 Aside/Sheet 容器，canonical path 只由显式动作进入；编辑、自动保存和业务 mutation 仍属任务域 |
| Shell / Tauri | 窗口控制、drag region、启动骨架、Header/Footer、Launcher 和平台生命周期 |
| 局部样式例外 | 虚拟坐标、动态尺寸、Tauri 几何、业务实体色和运行时进度；不得扩张为 feature 私有主题 |
| Linear 参考 | 提供视觉与交互方向、公开可测结果和人工评审基线；不是代码、token 或品牌依赖 |

“HeroUI-only”指所有可由组件库表达的标准 UI 均由 HeroUI 提供，不等于禁止 React DOM、Tailwind 布局、TanStack Virtual、Tauri 平台 CSS 或 StoneFlow 产品组合组件。

## Definition of Done

- 全部当前有效验收标准（不含明确延期的 AC-37）都有自动化测试、静态扫描、截图对比或真实 Tauri/WebView 验收证据。
- 所有现有用户可达表面均已迁移到 HeroUI，或登记为本 SPEC 明确允许的产品/平台例外。
- 生产依赖和源码不再引用 Radix、shadcn、cmdk、旧 base primitive、旧 adapter、旧 pattern class 或旧 `--sf-*` UI token。
- `package.json` 与应用源码不再由 StoneFlow 直接声明或调用 `tw-animate-css`、Motion/Framer Motion、CSS/Tailwind 动画或过渡；HeroUI 官方安装合同要求的供应商实现依赖及其传递依赖按精确锁定链路允许，StoneFlow 不消费其动画 API。
- HeroUI semantic theme 成为唯一 UI 视觉真相，局部样式例外有可审计边界，不存在第二套隐形 design system。
- Linear-inspired Light 视觉、Inter Variable 字体、Sidebar 三态、窗口 `1024px` 驱动的 Aside / Sheet 详情合同和键盘合同通过已批准基线与 macOS WKWebView 验收；Windows 支持保留，但不属于本任务的验收结论。
- HeroUI Pro 的 CollectUI 安装器、组件版本和树 SHA-256 均已锁定，干净环境构建可重复，仓库、日志和产物不包含 Key 或不可再分发资产。
- TypeScript、lint、格式、模块边界、相关组件测试、生产构建和 Rust 测试通过；无阻塞或高严重度的视觉、交互或可访问性缺陷。
- 所有在 PLAN 登记的长期文档已同步为落地后的当前真相，任务偏差已记录后归档。

## 验收标准

### UI 平台与样式系统

- **AC-1**：当任务完成时，所有现有用户可达的标准控件应当由 HeroUI OSS 或 HeroUI Pro 提供；只有本 SPEC 登记的产品、虚拟化和平台例外可以使用局部实现。
- **AC-2**：当扫描生产依赖与源码时，系统应当不存在 Radix、shadcn、cmdk、旧 base primitive、旧 adapter、旧 pattern class 导出或旧 `--sf-*` UI token 的有效引用。
- **AC-3**：当 HeroUI 已提供对应标准组件时，系统应当直接使用其公开组合 API，不得维护只透传属性、复制 slots 或复刻 variants 的 StoneFlow 同名 wrapper。
- **AC-4**：当 feature 表达自身 UI 时，系统应当只用 Tailwind 处理结构、布局、响应式、尺寸、溢出和必要文字层级，不得局部硬编码通用组件的颜色、阴影、圆角、hover、focus 或 disabled 皮肤。
- **AC-5**：如果样式属于虚拟化坐标、拖拽尺寸、Tauri 平台窗口、业务实体数据色或运行时进度，则系统应当允许局部实现；普通 UI 不得借用这些例外建立 feature 私有皮肤。

### 颜色、字体与视觉

- **AC-6**：当浅色主题加载时，系统应当按本 SPEC 的已确认色彩合同呈现近中性灰层级，使 `#f3f3f4` 壳层后退、`#fcfcfd` 主工作面突出、`#ffffff` 抬升表面可辨识且主布局无厚重投影。
- **AC-7**：当任意 HeroUI 组件使用背景、表面、文字、边界、Accent、focus、success、warning 或 danger 语义时，系统应当从同一套 HeroUI semantic theme 或本 SPEC 登记的全局组件状态配方取值；feature 不得复制这些色值建立私有皮肤。
- **AC-8**：当组件进入 Hover、Active/Pressed/Open、Focus-visible、Selected/Current、Disabled、Loading、Invalid 或 Closed 状态时，同类组件应当获得一致且可区分的反馈；Active 不得冒充 Focus-visible，Focus-visible 不得只依赖中性背景或边框变化。
- **AC-9**：当文本或交互图形使用最终色板时，普通重要文本应当达到 `4.5:1` 对比度，必要非文本控件与焦点提示应当达到 `3:1`；低对比中性边框只能作为装饰分层，disabled 与纯装饰内容应单独标记。
- **AC-10**：当主窗口或 Launcher 渲染文字时，拉丁字符与数字应当使用本地 Inter Variable，中文应当使用统一系统中文 fallback，并且 400/500/600 实际字重不得依赖伪粗体。
- **AC-11**：当进行视觉回归时，系统应当以本 SPEC 的色值表与对比度结果为颜色真相，并使用同步后的 HeroUI 原型和新版 StoneFlow 关键页面截图验证渲染结果；迁移前 StoneFlow 与 Linear 截图不得作为逐像素复制要求。
- **AC-12**：当任务完成时，系统应当只提供浅色主题，生产样式不得残留会生成另一套未维护视觉结果的旧 dark token 或 `dark:` 分支。
- **AC-13**：当渲染 Sidebar、工具栏和 TaskBoard 时，系统应当以批准的 Linear-style 桌面密度为基线：导航与工具控件 `28–32px`、任务行 `44px`、任务标题 `13px / 20px / 500`、分组标题 `34px`、常用图标 `14–16px`。

### Sidebar 三态

- **AC-14**：当窗口宽度 `>=1024px` 时，Sidebar 应当处于展开宽栏或 `48px` icon rail 两种桌面状态之一。
- **AC-15**：当 Sidebar 处于展开状态时，用户应当可以在 `220px–330px` 范围调整宽度，首次默认宽度应当为 `256px`。
- **AC-16**：当用户点按伸缩控制区且未发生拖动时，Sidebar 应当在展开态和 icon rail 间切换；当用户拖动该控制区时，系统应当只调整展开宽度。
- **AC-17**：当用户仅使用键盘操作 Sidebar 伸缩控制区时，系统应当提供宽窄切换和分步调宽能力，并暴露可访问名称、当前宽度与展开状态。
- **AC-18**：当用户提交展开宽度或切换桌面宽窄状态后重启应用时，系统应当恢复该偏好；响应式隐藏不得覆盖已保存值。
- **AC-19**：当窗口宽度 `<1024px` 时，Sidebar 应当释放全部布局占位，并通过 Sheet 展示同一套导航和业务操作。
- **AC-20**：当窗口跨越 `1024px` 或 Sidebar 切换、拖宽时，主内容应当保持当前导航与滚动上下文，不执行 StoneFlow 第一方宽度或位移过渡，且不出现首帧闪栏或整屏宽条带。

### 任务详情与 Peek

- **AC-21**：当用户从任务集合点击任务或按 `Enter` 且窗口宽度 `>=1024px` 时，系统应当使用 HeroUI Pro Resizable 在 Main surface 内打开可编辑的非模态 Aside；列表 Panel 不小于 `352px`，Aside 最小 `320px`、默认 `360px`、最大 `440px`，分隔控件必须可用键盘操作。
- **AC-22**：当用户从任务集合打开正式详情且窗口宽度 `<1024px` 时，系统应当保留 `?task=` URL 并以 HeroUI Sheet 渲染同一份可编辑详情，不得自动导航 canonical 完整页。
- **AC-23**：当 active `?task=` 详情跨越窗口 `1024px` 时，系统应当只在 Aside 与 Sheet 之间替换容器；`?task=`、任务 ID、草稿、autosave 和路由历史不变，不自动关闭详情或进入完整页。Sidebar 与详情应当消费同一 `isCompact`，保留各自 open state，并保证窄窗两张模态 Sheet 不同时打开。
- **AC-24**：当用户关闭 Aside 或 Sheet 时，如果原触发项仍存在，系统应当恢复原触发项；否则恢复当前实体行，实体已不存在时恢复集合根。Aside 不得形成模态焦点陷阱，Sheet 使用 HeroUI 的标准模态焦点语义。
- **AC-25**：当用户按 `Space` 时，系统应当只控制 Peek；当用户按 `Enter` 时，系统应当写入 `?task=` 并按窗口 `1024px` 边界打开 Aside 或 Sheet；只有当用户在详情 Header 显式选择“打开完整页”时，系统才应当先 flush 当前草稿再导航 canonical 路径。

### 键盘、焦点与命令

- **AC-26**：当 pointer hover 建立唯一 current 后按方向键、`J/K` 或 `Home/End` 时，系统应当从该项移动真实集合焦点、切换为键盘细边框并将目标滚入视野；pointer current 本身无边框。collection root 有焦点但没有行 current 时，应当按方向从首项或末项建立键盘 current。
- **AC-27**：当用户按 `X` 或 `Shift+方向键` 时，系统应当分别执行 current 项切换或固定 anchor 的连续范围选择，并以单一 selection 状态为结果真相；没有行 current 的首次 Shift 导航按方向从首项或末项建立 anchor。
- **AC-28**：当 collection root 或行拥有真实焦点且用户按 `Cmd/Ctrl+A` 时，系统应当选择按键时当前视图中已加载且可操作的项目，之后加载的项目不得自动加入；当焦点位于输入/编辑器或集合之外时，系统应当保留原有快捷键语义。
- **AC-29**：只要输入框、编辑器、contenteditable 或 IME 正在接收输入，系统就不得触发 `J/K/X/Space/P/S/D` 等产品字符快捷键。
- **AC-30**：当多个 overlay、Detail Aside、Peek、选择和页面层同时存在且用户按 Escape 时，系统应当按“输入法/编辑 → 当前 Menu/Dialog/Sheet → Detail Aside → Peek → Selection → 页面”的顺序只消费最高优先级层。
- **AC-31**：当同一业务命令从 Command、ContextMenu、ActionBar、行操作或直接快捷键触发时，系统应当使用同一份可用性、disabled reason、目标快照和执行入口。
- **AC-32**：当 Menu、Popover、Modal、Sheet 或 ContextMenu 关闭时，如果原触发项仍存在，系统应当恢复原触发项；虚拟触发项已卸载时先滚动并重新挂载；实体已不存在时恢复集合根，集合已为空时恢复空态主操作。

### TaskBoard 与集合

- **AC-33**：当 TaskBoard 完成重构时，现有分组、折叠、sticky header、TanStack Virtual、增量加载、服务端总高度和 `scrollToTaskId` 应当保持可用，旧焦点/选择状态机应当被删除；列表行只应在自身容器 `<560px` 时进入唯一紧凑档，不得依赖 viewport 或增加多档 JS 布局状态。
- **AC-34**：当普通集合与 TaskBoard 执行焦点和选择操作时，系统应当共享同一份产品交互合同，不得维护两套需要互相同步的焦点或选择真相。
- **AC-35**：当目标实体尚未挂载时，系统应当先滚动并挂载再恢复真实焦点；当实体已删除时，系统应当回退到确定的相邻项、集合根或空集合的主操作。
- **AC-36**：当选择跨越虚拟卸载或分组折叠时，系统应当按稳定实体 ID 保留选择；当实体删除时移除该项，筛选或查询变化时与新可操作集合取交集，增量加载时不自动加入新项目，并正确呈现单项与连续选择分组。
- **AC-37（延期）**：TaskBoard 量化性能预算已移入独立的 MainCard + 虚拟列表整体重构任务；本轮保留 fixture 与历史基线，但不把该项计入 Definition of Done，也不得据此宣称性能已通过。

### 完整迁移与工程收口

- **AC-38**：当复核迁移清单时，每个现有用户可达表面都应当对应 HeroUI 组件、StoneFlow 产品组合组件或本 SPEC 明确例外，不得以“尽量迁移”作为完成条件。
- **AC-39**：当用户在任一迁移后的现有表面执行迁移前已有操作时，系统应当保持相同的领域结果、校验、自动保存、错误处理和反馈语义，同时允许视觉与交互实现按本 SPEC 重写。
- **AC-40**：当在隔离环境安装和构建时，系统应当以进程环境注入 `HEROUI_KEY`，通过 `hpsetup@4.7.0` 取得或恢复 `@heroui-pro/react@1.0.0-beta.8`，且解包树 SHA-256 与批准记录一致，frozen install、类型检查和生产构建均通过；仓库、日志和应用产物不得包含 Key 或可再分发的私有源码。

### 第一方动画清零

- **AC-41**：当扫描 `package.json`、应用样式和生产源码时，系统应当不存在 StoneFlow 对 `tw-animate-css`、Motion/Framer Motion、CSS/Tailwind animation/transition、平滑滚动、Web Animations API 或 View Transition API 的声明、import 或调用；锁定依赖中只允许 HeroUI 官方安装合同要求的供应商实现依赖，StoneFlow 不得消费其动画 API。
- **AC-42**：当 Sidebar、Overlay、Toast、Progress、Launcher 或列表状态变化时，HeroUI 组件可以呈现其官方样式自带的动效；StoneFlow 自建 resize rail、Launcher 几何和列表状态等没有 HeroUI 动效来源的部分应当即时切换，不得叠加自建动画、时长、缓动或 keyframe。Sidebar 实时拖拽期间可以临时关闭 HeroUI 官方 width transition，以保证指针与宽度一一对应，但不得定义替代动画。
- **AC-43**：当第一方动画被清除后，Sidebar 拖宽、虚拟滚动、sticky、焦点恢复、Loading/Progress 的文字与 ARIA、Overlay 卸载和领域结果应当保持正确；`requestAnimationFrame` 只能承担非动画调度与批处理。
- **AC-44**：当系统启用“减少动态效果”时，锁定版 HeroUI 的 Modal、Popover、Tooltip、Sheet、Sidebar、Toast 与 Progress 应当遵守其官方 reduced-motion 合同；如果实测失败，应当优先采用已修复的官方版本或记录阻塞，不得新增 feature 级动画兼容层。

## 关联模块

| 模块 | 本任务中的角色 |
|---|---|
| `package.json`、`bun.lock`、Vite/Vitest 配置 | HeroUI 依赖、样式入口、构建拆包、测试环境与可重复安装 |
| `src/styles/`、`index.html`、Launcher 入口 | HeroUI theme、Inter 字体、第一方动画清理、全局/平台规则、启动壳与旧样式删除 |
| `src/shared/components/base/` | 旧 Radix/shadcn/cmdk primitive 的完整迁移与删除范围 |
| `src/shared/components/patterns/`、detail/preview tokens | 纯样式中间层删除与真实产品组件归位 |
| `src/shared/components/row/`、Tooltip/scroll infrastructure | 行交互、焦点、选择、虚拟 viewport 与必要基础设施例外 |
| `src/layout/` | Inset Shell、Sidebar 三态、Header/Footer、Peek、任务详情 Aside 与 overlay 层级 |
| `src/features/command/` | Command UI、Registry、Runtime、keybinding、目标解析和 Escape 作用域 |
| `src/features/selection/`、`src/features/bulk-action/` | 单一 collection selection、领域快照与 HeroUI Pro ActionBar |
| `src/features/task/` | TaskBoard 虚拟集合、Linear 键盘合同、Peek、完整详情和 ContextMenu |
| `src/features/project/`、`src/features/lifecycle/` | 普通集合、分组与业务动作迁移 |
| `src/features/search/`、`src/features/launcher/` | 搜索 collection、独立窗口、焦点与共享主题 |
| `src/features/filter/`、display-options、metadata、settings | 现有配置、筛选、表单与导航表面迁移 |
| activity、update、changelog、app-info、create/edit 等 feature | Timeline、Dialog、Sheet、表单、反馈和长尾表面迁移 |
| `src-tauri/` | 原生窗口、透明度、平台菜单、快捷键与 WebView 验收 |
| `Documents/01-架构/` 与模块文档 | 技术栈、界面系统、样式边界、重大决策和落地后真相同步 |

## 当前技术方案

本任务命中独立 PLAN 门槛：涉及 HeroUI Pro 第三方集成、全局样式架构、Sidebar 组合限制、详情响应式路由、集合状态机、迁移顺序与不可逆清理。技术方案由 [PLAN.md](./PLAN.md) 维护，执行状态与阻塞由 [TASKS.md](./TASKS.md) 维护。

已锁定的技术约束包括：`HeroUI OSS + HeroUI Pro + Tailwind CSS v4`、HeroUI semantic theme 单一真相、本 SPEC 已确认的浅色色彩合同、Inter Variable、HeroUI 官方动效唯一来源与 StoneFlow 第一方零动画、Sidebar 与任务详情各自拥有独立状态但共用窗口 `1024px` 边界、宽屏 Aside / 窄屏 Sheet、不采用 StyleX、不长期保留旧 UI 平台。

## 关联文档

- [HeroUI 浅色设计预览](../../99-素材/02-HTML原型/stoneflow_heroui_light_v1.html)
- [任务方案编写 SOP](../../任务方案编写SOP.md)
- [文档体系 SOP](../../文档体系SOP.md)
- [系统设计](../../01-架构/A2-系统设计.md)
- [界面系统](../../01-架构/A3-界面系统.md)
- [前端整体架构](../../../src/ARCHITECTURE.md)
- [样式架构](../../../src/styles/ARCHITECTURE.md)
- [Command 架构](../../../src/features/command/ARCHITECTURE.md)
- [Selection 架构](../../../src/features/selection/ARCHITECTURE.md)
- [Linear 2026 UI Refresh](https://linear.app/changelog/2026-03-12-ui-refresh)
- [Linear：Behind the latest design refresh](https://linear.app/now/behind-the-latest-design-refresh)
- [Linear：How we redesigned the Linear UI](https://linear.app/now/how-we-redesigned-the-linear-ui)
- [HeroUI Pro Sidebar](https://heroui.pro/docs/react/components/sidebar)
- [HeroUI Pro Resizable](https://heroui.pro/docs/react/components/resizable)
- [HeroUI Pro Sheet](https://heroui.pro/docs/react/components/sheet)
- [Inter Variable](https://rsms.me/inter/)
