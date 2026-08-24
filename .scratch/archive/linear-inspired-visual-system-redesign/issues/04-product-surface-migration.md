# 04 — 重建全局视觉核心并迁移代表表面

**What to build:** StoneFlow 的冷灰、Accent、圆角、密度、边框、阴影与 HeroUI 状态由全局唯一 Owner 自动应用；代表性页面不再通过局部视觉 utility 覆盖公共 recipe。

**Blocked by:** 03 — 完成 HeroUI OSS/Pro 公共皮肤 Hard Cut

**Status:** completed; archived

- [x] 新 HeroUI 公共视觉值统一归 `theme.css` 唯一 Owner，并明确实现 Control/Surface/Overlay/pill 四类圆角、`6/8/12px`、HeroUI `sm/md/lg → 28/32/36px`、`1px` 结构边框及“阴影只用于浮层/拖拽”的合同；迁移期旧 token 轨隔离存在并由 Ticket 05 Hard Cut，强调度只由 variant 决定。
- [x] `fonts.css` 只保留 `@font-face` 资产声明；字体族语义映射归 `theme.css`，避免两个文件同时宣称拥有字体值。
- [x] 保留既有冷灰 Light palette、六组 Accent 与固定状态色；不新增 Dark、任意主题配置、运行时颜色生成或 TypeScript token 镜像。
- [x] `components.css` 只消费全局语义值，并按实际消费者逐组件核对 HeroUI OSS/Pro 公开 BEM 与 documented ARIA/data attributes，统一 variant、尺寸和完整状态；不包含 Feature 分支、Accent 分支或独立原始颜色。
- [x] Main 与 Launcher 继续只导入同一个 `styles/index.css`，并在 React 挂载前复用现有 `bootstrapAppearance()`；不新增 `@/visual-system` Facade、Provider 或安装函数。
- [x] HeroUI 原子控件、集合 Item 与 Overlay chrome slot 只保留外部尺寸/位置、overflow、placement 与运行时动态几何；删除会覆盖内部 layout/metrics、公共颜色、边框、圆角、阴影、ring 与交互状态的局部 utility。Form、RadioGroup、Surface、Resizable、Trigger 等结构组件仍可表达产品布局，但不得拥有公共皮肤。
- [x] 先用 Shell/Sidebar、PageFrame、RowShell、Menu/Popover、Modal/Sheet、Settings/Form 与 Launcher 的最少真实消费者证明公共规则可以独立呈现，不按页面复制皮肤。
- [x] 保留 Sidebar、TaskBoard、Detail、Resizable、Launcher 与 Tauri 的既有动态几何、URL、选择、Focus、Overlay 和窗口生命周期合同。
- [x] 在现有脚本门禁内加入高置信视觉所有权检查，识别 HeroUI import 及 dot-notation parts，报告 root/part/slot 的越权内部 layout/metrics、skin/state utility 与旧样式路径导入；不新增依赖，不修改 `package.json` 或 `bun.lock`。
- [x] 只测试公开行为与所有权合同，不新增 className snapshot、Storybook 或截图基础设施；真实视觉仍留给 Ticket 06。

## Review record

- `theme.css` 统一拥有 `6/8/12px` 语义圆角、`28/32/36px` 控件高度、字体映射与既有冷灰/六 Accent；`fonts.css` 只保留字体资产。
- `index.css` 显式冻结 `theme → base → components → utilities → stoneflow-components` cascade 顺序；公共 recipe 稳定接管 HeroUI 默认样式与消费者 utility，不使用 `!important`。
- Button/Toggle、Field、Card/Surface、Menu/List/Command、Popover/Modal/Sheet、Sidebar、Disclosure、Alert/Chip/Toast 已按公开 BEM 与实际 ARIA/data 状态统一尺寸、边界、圆角与组合态；`components.css` 没有原始颜色或 Accent 分支。
- Shell/Sidebar、Filter、Global Search、Launcher、Settings、Detail 与各类 Modal 的代表消费者已删除 root/part/slot 上的通用皮肤；双行 Launcher 结果通过 `aria-current` 表达 current，产品内容布局留在普通子节点。
- 原生窗裁切、嵌入式 Detail/Alert、窗口控制与可变内容高度只通过稳定产品语义 hook 保留必要例外；没有新增 wrapper、Facade、Provider、CVA 或 TypeScript token 镜像。
- `check-feature-boundaries.ts` 保留既有 Feature public-surface 检查并增加高置信 HeroUI 视觉所有权扫描；基于 Bun 原生 import scan 识别当前真实使用的 named import（含 alias）、dot-notation、静态 `className/classNames`、旧视觉入口与 `!important`，同时放行结构组件布局和外部/运行时几何。
- `shared/components/patterns` 与其剩余消费者仍按 Ticket 05 单独 Hard Cut；本 Ticket 只移除了会竞争公共 recipe 的代表性皮肤，不提前混入旧轨删除。

## Verification record

- `bun run test:run`：190 files / 892 tests 通过；Launcher 的旧 className snapshot 已改为 `aria-current` 行为断言。
- `bun run test:scripts`：17 files / 154 tests 通过；视觉所有权 scanner fixtures 4/4 通过。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、`bun run check:animations` 与 `git diff --check` 通过；lint 仅输出仓库既有 warning。
- `bun run build` 通过；保留依赖侧既有 BigInt target 与大 chunk warning。
- `package.json`、`bun.lock`、用户暂存区均未被本 Ticket 修改；未暂存、未 commit。
- 尚未执行真实 Tauri Main/Launcher 视觉与完整状态走查；该项不能由 jsdom 或构建替代，留待 Ticket 06 集成验收。

## Worktree rule

- 当前未提交的旧 Ticket 04 diff 不作为已完成证据。实施前先按新合同分类：产品行为与动态几何保留；基于旧所有权的视觉迁移重写；无法确认归属的改动不静默丢弃。
- 不使用 `git reset --hard`、`git checkout --` 或整树覆盖。`package.json`、`bun.lock` 与用户暂存区始终不动。

## Verification

- 代表性 DOM 行为测试通过，覆盖键盘、Focus、Selection、Overlay、ContextMenu、Detail 和 Launcher 生命周期。
- 视觉所有权、Shell Theme Sync、第一方动效与模块边界脚本通过。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、相关测试、生产构建与 `git diff --check` 通过。
- 未执行真实 Tauri Main/Launcher 走查时，不得把本 Ticket 描述为视觉验收完成。
