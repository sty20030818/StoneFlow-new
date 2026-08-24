# 03 — 完成 HeroUI OSS/Pro 公共皮肤 Hard Cut

**What to build:** StoneFlow 为所有当前实际使用的 HeroUI OSS/Pro 标准控件提供完整一致的公共视觉与状态反馈，使代表性消费表面不再依赖组件库默认皮肤，同时保留原有键盘、Overlay、Focus 和可访问性行为。

**Blocked by:** 02 — 冻结代表性 Light 视觉合同

**Status:** completed; archived

- [x] 对当前用户可达表面实际使用的 HeroUI OSS/Pro 组件完成消费者清单；不为仓库尚未使用的组件预建样式。
- [x] Button、表单控件、列表项、Menu、Popover、Command、Modal、Sheet、Alert、Chip 等实际消费者均由唯一公共 BEM/data-state recipe 提供 StoneFlow 皮肤；Tabs 当前零消费者，本轮不预建。
- [x] 每个实际组件覆盖其适用的 Rest、Hover、Pressed、Selected、Focus-visible、Open、Disabled、Loading、Invalid 与 Danger 状态及必要组合态。
- [x] 公共 recipe 只消费唯一语义主题值，不包含独立原始颜色，不因 Accent 预设复制六套组件规则。
- [x] HeroUI OSS/Pro 继续拥有结构、行为、键盘交互、Overlay 语义、Focus 管理与 ARIA；本次只替换视觉结果。
- [x] 每类公共 recipe 在代表性真实消费者上能够独立呈现完整 StoneFlow 视觉，不依赖 feature 补齐缺失状态；全量产品消费者的竞争性私有皮肤由后续横切迁移统一删除。
- [x] 不新增一对一组件 wrapper、TypeScript token 镜像、第二套 variant runtime、设计系统包、Storybook 或新依赖。
- [x] 现有组件与 Overlay 行为测试保持通过；CSS-only 改动没有新增 className 快照或无用户价值的状态断言。

## Consumer inventory

- HeroUI OSS 交互控件：Button、Input/TextField/TextArea/SearchField、Select/ListBox、Checkbox、Switch、Radio/RadioGroup、ToggleButton/ToggleButtonGroup、Dropdown、Popover、Modal、AlertDialog 与 Tooltip。
- HeroUI OSS 反馈与表面：Alert、Chip、Badge、Toast、Spinner、Skeleton、ProgressBar/ProgressCircle、Card、Surface、ScrollShadow、Separator、Avatar、Kbd、Breadcrumbs、Disclosure、Label、Description、FieldError、Header 与 Form。
- HeroUI Pro：ActionBar、Command、ContextMenu、EmptyState、ListView、Sheet、Sidebar、Timeline 与 Resizable。
- Tabs 没有生产导入；仓库内旧 `base/tabs.tsx` 也没有消费者，留待 Ticket 05 零消费者清理，不建立公共 recipe。

## Review record

- `src/styles/components.css` 统一拥有六类必要皮肤：Button/Toggle、字段与选择控件、Menu/List/Command/Sidebar 项目状态、Overlay 壳层与 Backdrop、Alert/Toast/Card/Chip/ActionBar 反馈表面、Disclosure 展开状态。
- Avatar、Badge、Progress、Spinner、Skeleton、Timeline、Resizable、Surface、Separator、ScrollShadow、Breadcrumbs、Label/Description/FieldError、EmptyState 等已逐项核对；它们的实际视觉只消费 `theme.css` 语义值或属于 HeroUI 结构行为，因此不堆重复 BEM 覆盖。
- Rest/Hover/Pressed/Selected/Open/Focus/Disabled/Pending/Invalid/Danger 继续由 HeroUI 已公开的 BEM、data/aria 状态驱动；StoneFlow 只替换半径、表面、边界、状态色与 elevation，没有改 JSX、ARIA、键盘、Focus restore、Overlay、Sheet 拖拽或 reduced-motion 行为。
- 代表性消费者覆盖 Shell/Sidebar、Board/Row、Command/Search、Filter/Display、Create/Confirm/Detail Overlay、Settings/Form、Update/Feedback 与 Launcher；feature 私有通用皮肤迁移仍属于 Ticket 04，旧轨道删除仍属于 Ticket 05。

## Verification

- 13 个代表性 DOM 文件 / 77 tests 通过，覆盖 Button/Field/Selection、Menu/List/Command、Overlay Focus restore、Detail Sheet、反馈与 Loading 行为。
- `bun typecheck`、`bun lint`、`bun lint:boundaries`、`bun run check:animations` 与 `bun test scripts/check-shell-theme-sync.test.ts` 通过；lint 仅保留仓库既有 warning。
- `bun run build` 通过；保留既有 BigInt target 与大 chunk warning。
- `bun run format:check src/styles/components.css`、公共 recipe 原始颜色/Accent 分支静态扫描与 `git diff --check` 通过。
- 新增反馈软底文字配对实算最低为钴蓝 `4.96:1`；Success `5.75:1`、Warning `5.62:1`、Danger `5.96:1`。
- `package.json` 与 `bun.lock` 未修改；没有新增依赖、组件 wrapper、脚本或测试基础设施。
- 尚未执行真实 Tauri Main/Launcher 与完整交互状态视觉走查；该项不由 jsdom 或构建替代，留待 Ticket 06 集成验收。
