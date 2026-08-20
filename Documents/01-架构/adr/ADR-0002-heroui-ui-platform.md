# ADR-0002：以 HeroUI OSS/Pro 作为唯一 UI 平台

## 状态

已接受。

## 背景

StoneFlow 当前同时存在 Radix/shadcn primitive、`shared/components/base`、纯 class pattern、多层 `--sf-*` token 以及 feature 局部样式。标准控件、产品组合、业务行为和平台几何因此混在一起，键盘、焦点、Overlay 与选择也出现重复状态源。

本次重构允许破坏性切换且不保留旧 UI 兼容层，需要先固定长期依赖方向、私有依赖供应链和必须由 StoneFlow 自己拥有的产品边界。

## 决策

1. 所有已有用户可达的标准控件、表单、导航、Overlay、反馈和 HeroUI Pro 已提供的高阶表面，统一使用 HeroUI OSS v3 或 HeroUI Pro；不再混用 shadcn/Radix 或建立同名透传 wrapper。
2. 样式引擎统一为 Tailwind CSS v4 + 一份 StoneFlow semantic theme + 一份集中组件状态 recipe。`src/styles/index.css` 是 renderer 唯一样式入口，`theme.css` 是全局语义值唯一 Owner，`components.css` 是 HeroUI OSS/Pro 公共 BEM 与逐组件核对的 documented ARIA/data attributes 视觉唯一 Owner。旧 token/pattern/adapter 不双轨兼容。
3. 依赖方向固定为“StoneFlow 产品组件 → 应用用例/领域接口”与“StoneFlow 产品组件 → HeroUI/React Aria → DOM”；领域和应用层不得反向依赖 UI，也不得导入 HeroUI 类型。
4. HeroUI 管理标准组件结构、行为、键盘交互、Focus、Overlay 语义与可访问性；StoneFlow 管理全部视觉结果，并保留产品语义、业务状态、Tauri 原生窗口几何、Sidebar 已确认三态、Task Detail 基于窗口 `1024px` 断点的 Aside / Sheet 容器合同、TaskBoard 特殊虚拟几何与 Command/selection 产品合同。
5. TaskBoard 的焦点与选择由 React Aria/React Stately 的单一 collection state 拥有，现有 TanStack Virtual 只保留分组、sticky、总高度、增量加载和滚动几何职责。
6. StoneFlow 不编写或消费 Motion/Framer Motion、CSS/Tailwind 动画与过渡。HeroUI OSS/Pro 包内动效是唯一组件动效来源，并由其处理 reduced motion。
7. HeroUI Pro 作为私有依赖精确锁版。当前供应链固定使用 CollectUI `hpsetup@4.7.0` 获取 `@heroui-pro/react@1.0.0-beta.8`；本地与 CI 只通过进程环境或 secret store 注入 `HEROUI_KEY`，Key 不得进入源码、lockfile、客户端环境、日志或构建产物。允许安装器复用固定版本缓存，但必须在仓库外完成隔离 frozen install、类型检查与生产构建，并记录解包后的树 SHA-256。
8. 只允许发布集成 HeroUI Pro 后的 StoneFlow 正常应用产物；不提交、拷贝、再分发或对外提供 Pro 组件源码、模板、私有 CDN 响应或解包资产。
9. 页面直接使用 HeroUI OSS/Pro Interface，不建立一对一 wrapper、TypeScript token 镜像、第二套 variant runtime 或独立 design-system package。HeroUI 原子控件、集合 Item 与 Overlay chrome slot 的局部 `className` 只允许外部尺寸/位置、overflow、placement 与运行时动态几何；内部布局、字体/图标 metrics 与公共皮肤必须回到集中 recipe。Form、RadioGroup、Surface、Resizable、ScrollShadow 与 Trigger 等结构组件可承载产品布局，但不得重写公共颜色、边框、圆角、阴影或交互状态。
10. 全局几何使用少量语义角色而非一个万能值：Control `6px`、Surface `8px`、Overlay `12px`、pill 仅用于 Chip/Avatar/状态标记；HeroUI `sm/md/lg` 高度映射为 `28/32/36px`，强调度只由 variant 决定；结构 Surface 使用 `1px` 边框，Row 使用分隔线，阴影只用于浮层或拖拽 elevation。
11. 跨 Feature 共享只保留具有真实行为、组合合同或产品语义的深 Module。纯 class 字符串、透传 wrapper 与只有一个实现的假想 Adapter 必须删除；`shared/components/patterns`、旧 `shared/components/base`、旧 token/shadcn adapter 均 hard cut，不保留兼容出口。

## 后果

### 正向影响

- 项目只保留一套标准组件、token、variant、Overlay 和焦点体系，降低视觉与交互分叉。
- 领域行为与 UI 供应商隔离，HeroUI Pro 升级或未来替换不会污染领域接口。
- Command、ContextMenu、ActionBar、Timeline、Sidebar 和普通集合优先使用 HeroUI 现成能力，不再自建第二套 primitive。
- 本地样式集中到语义主题、全局基础和少量已登记产品几何，而不是按 feature 复制皮肤。
- 常规页面调用方只需学习 HeroUI 本身；视觉修改集中在全局主题与公共 recipe，减少局部 className 争夺 CSS cascade 的情况。

### 成本与约束

- HeroUI Pro 当前仍为 beta，且 CollectUI `hpsetup` 是额外的第三方供应链；必须同时固定安装器与组件包版本，以隔离 frozen install、生产构建和树 SHA-256 验证已取得产物。缓存与源站都不可用时仍会阻断新环境安装，这是已接受的供应链可用性风险。
- CollectUI Key 可用与包完整性不构成 HeroUI 官方 license、seat、entitlement 或 Updates Window 的验证，本 ADR 不作这些声明。
- 迁移为 hard cut，不保留 Radix/shadcn 兼容层；中间切片可能破坏，每个阶段必须以无旧消费者、行为回归和构建门禁收口。
- 集中 recipe 与 HeroUI 当前公开 BEM 及 documented ARIA/data attributes 合同存在明确实现耦合；HeroUI 升级必须重新核对代表性状态，不通过 wrapper 假装供应商已经隔离。
- HeroUI 无法也不应取代 Tauri 平台窗口契约、虚拟列表几何或 StoneFlow 领域命令；这些例外必须保持小而明确，不得成为继续自建通用 UI 的借口。
- 任务详情不保存呈现偏好，也不建立第二份响应式状态。`?task=` 只表达 active task：Shell controller 的单一 `isCompact` 在窗口 `>=1024px` 时让 HeroUI Pro Resizable 渲染 Aside，列表最小 `352px`，Aside 最小 `320px`、默认 `360px`、最大 `440px`；窗口 `<1024px` 时渲染 Sheet。跨断点只替换容器并保留同一 URL、详情状态与草稿，不自动关闭详情或导航完整页。Sidebar 与详情 open state 独立，窄窗两张模态 Sheet 互斥。TaskBoard 只在自身容器 `<560px` 时进入唯一一档紧凑排版；canonical 完整页只由显式入口打开。

## 放弃的方案

- **继续使用 shadcn/Radix：** 无法收敛现有多层 wrapper/pattern/token，也不提供项目所需的完整集合交互能力。
- **shadcn React Aria + HeroUI 混用：** 会留下两套 React Aria wrapper、token、variant 和 Overlay 约定。
- **HeroUI + StyleX：** HeroUI 原生样式合同是 Tailwind CSS v4；加入 StyleX 只会增加第二条编译与样式心智模型，不提高最终视觉上限。
- **HeroUI Pro ListView/DataGrid 直接替换 TaskBoard：** 它们没有承诺当前分组 sticky、折叠、服务端总高度与外部 `scrollToTaskId` 合同。
- **按局部剩余空间动态决定详情容器：** 会让 Sidebar 宽度和拖拽过程隐式改变详情呈现，并增加不必要的尺寸观测与状态分支；固定窗口断点的行为更可预测。
- **窄窗口自动进入 canonical 完整页：** 断点切换会改写 URL 和浏览历史并中断列表上下文；Sheet 已覆盖窄窗口详情需求，完整页保留为显式操作。
- **强制零本地 UI 代码：** 会把产品语义、Tauri 几何与虚拟化硬塞进第三方组件，实际上增加脆弱覆盖。
- **新增 `@/visual-system` Facade 或设计系统 Provider：** 当前 CSS、DOM 与本机 Appearance 都是同进程且只有一个真实实现；现有 renderer 样式入口与 `appearance` Module 已形成足够小的 Interface，再加 Facade 只会混合职责。
- **公开通用 Surface/Radius/Tone 扩展参数：** 会把已删除的 class pattern 重新包装为另一套视觉语言，扩大调用方必须理解的 Interface。
- **本轮引入 Motion：** 当前需求是删除 StoneFlow 第一方动效层；定义新动效语言必须另立任务。

## 关联文档

- [任务 SPEC](../../03-重构任务/2026-08-12-heroui-ui-interaction-system-refactor/SPEC.md)
- [任务 PLAN](../../03-重构任务/2026-08-12-heroui-ui-interaction-system-refactor/PLAN.md)
- [任务 TASKS](../../03-重构任务/2026-08-12-heroui-ui-interaction-system-refactor/TASKS.md)
- [系统设计](../A2-系统设计.md)
- [界面系统](../A3-界面系统.md)
