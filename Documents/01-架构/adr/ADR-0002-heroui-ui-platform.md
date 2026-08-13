# ADR-0002：以 HeroUI OSS/Pro 作为唯一 UI 平台

## 状态

已接受。

## 背景

StoneFlow 当前同时存在 Radix/shadcn primitive、`shared/components/base`、纯 class pattern、多层 `--sf-*` token 以及 feature 局部样式。标准控件、产品组合、业务行为和平台几何因此混在一起，键盘、焦点、Overlay 与选择也出现重复状态源。

本次重构允许破坏性切换且不保留旧 UI 兼容层，需要先固定长期依赖方向、私有依赖供应链和必须由 StoneFlow 自己拥有的产品边界。

## 决策

1. 所有已有用户可达的标准控件、表单、导航、Overlay、反馈和 HeroUI Pro 已提供的高阶表面，统一使用 HeroUI OSS v3 或 HeroUI Pro；不再混用 shadcn/Radix 或建立同名透传 wrapper。
2. 样式引擎统一为 Tailwind CSS v4 + HeroUI semantic theme + 一份集中组件状态 recipe。旧 token/pattern/adapter 在消费者归零后删除，不双轨兼容。
3. 依赖方向固定为“StoneFlow 产品组件 → 应用用例/领域接口”与“StoneFlow 产品组件 → HeroUI/React Aria → DOM”；领域和应用层不得反向依赖 UI，也不得导入 HeroUI 类型。
4. HeroUI 管理标准组件交互和视觉；StoneFlow 只保留产品语义、业务状态、Tauri 原生窗口几何、Sidebar 已确认三态、Task Detail Sheet/Aside 容器选择、TaskBoard 特殊虚拟几何与 Command/selection 产品合同。
5. TaskBoard 的焦点与选择由 React Aria/React Stately 的单一 collection state 拥有，现有 TanStack Virtual 只保留分组、sticky、总高度、增量加载和滚动几何职责。
6. StoneFlow 不编写或消费 Motion/Framer Motion、CSS/Tailwind 动画与过渡。HeroUI OSS/Pro 包内动效是唯一组件动效来源，并由其处理 reduced motion。
7. HeroUI Pro 作为私有依赖精确锁版。当前供应链固定使用 CollectUI `hpsetup@4.7.0` 获取 `@heroui-pro/react@1.0.0-beta.8`；本地与 CI 只通过进程环境或 secret store 注入 `HEROUI_KEY`，Key 不得进入源码、lockfile、客户端环境、日志或构建产物。允许安装器复用固定版本缓存，但必须在仓库外完成隔离 frozen install、类型检查与生产构建，并记录解包后的树 SHA-256。
8. 只允许发布集成 HeroUI Pro 后的 StoneFlow 正常应用产物；不提交、拷贝、再分发或对外提供 Pro 组件源码、模板、私有 CDN 响应或解包资产。

## 后果

### 正向影响

- 项目只保留一套标准组件、token、variant、Overlay 和焦点体系，降低视觉与交互分叉。
- 领域行为与 UI 供应商隔离，HeroUI Pro 升级或未来替换不会污染领域接口。
- Command、ContextMenu、ActionBar、Timeline、Sidebar 和普通集合优先使用 HeroUI 现成能力，不再自建第二套 primitive。
- 本地样式集中到语义主题、全局基础和少量已登记产品几何，而不是按 feature 复制皮肤。

### 成本与约束

- HeroUI Pro 当前仍为 beta，且 CollectUI `hpsetup` 是额外的第三方供应链；必须同时固定安装器与组件包版本，以隔离 frozen install、生产构建和树 SHA-256 验证已取得产物。缓存与源站都不可用时仍会阻断新环境安装，这是已接受的供应链可用性风险。
- CollectUI Key 可用与包完整性不构成 HeroUI 官方 license、seat、entitlement 或 Updates Window 的验证，本 ADR 不作这些声明。
- 迁移为 hard cut，不保留 Radix/shadcn 兼容层；中间切片可能破坏，每个阶段必须以无旧消费者、行为回归和构建门禁收口。
- HeroUI 无法也不应取代 Tauri 平台窗口契约、虚拟列表几何或 StoneFlow 领域命令；这些例外必须保持小而明确，不得成为继续自建通用 UI 的借口。

## 放弃的方案

- **继续使用 shadcn/Radix：** 无法收敛现有多层 wrapper/pattern/token，也不提供项目所需的完整集合交互能力。
- **shadcn React Aria + HeroUI 混用：** 会留下两套 React Aria wrapper、token、variant 和 Overlay 约定。
- **HeroUI + StyleX：** HeroUI 原生样式合同是 Tailwind CSS v4；加入 StyleX 只会增加第二条编译与样式心智模型，不提高最终视觉上限。
- **HeroUI Pro ListView/DataGrid 直接替换 TaskBoard：** 它们没有承诺当前分组 sticky、折叠、服务端总高度与外部 `scrollToTaskId` 合同。
- **强制零本地 UI 代码：** 会把产品语义、Tauri 几何与虚拟化硬塞进第三方组件，实际上增加脆弱覆盖。
- **本轮引入 Motion：** 当前需求是删除 StoneFlow 第一方动效层；定义新动效语言必须另立任务。

## 关联文档

- [任务 SPEC](../../03-重构任务/2026-08-12-heroui-ui-interaction-system-refactor/SPEC.md)
- [任务 PLAN](../../03-重构任务/2026-08-12-heroui-ui-interaction-system-refactor/PLAN.md)
- [任务 TASKS](../../03-重构任务/2026-08-12-heroui-ui-interaction-system-refactor/TASKS.md)
- [系统设计](../A2-系统设计.md)
- [界面系统](../A3-界面系统.md)
