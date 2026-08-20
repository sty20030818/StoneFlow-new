# 04 — 横切迁移 StoneFlow 产品表面

**What to build:** 用户在 Shell、任务集合、浮层、详情、设置和 Launcher 之间获得同一套 StoneFlow 视觉关系，而既有产品结构、领域操作与桌面窗口行为保持不变。

**Blocked by:** 03 — 完成 HeroUI OSS/Pro 公共皮肤 Hard Cut

**Status:** implemented

- [x] Shell/Sidebar、MainCard/PageFrame、TaskBoard/RowShell、Command/Menu/Popover、Modal/Sheet/Detail、Settings/Form 与 Launcher 全部消费统一语义主题与公共组件 recipe。
- [x] 产品组件只保留稳定结构、业务语义和必要动态几何；feature 不再定义通用 Button、Field、List、Menu、Modal 或 Sheet 的私有皮肤。
- [x] 各集合页的 Header、Toolbar、Filter、Display 与 Body 使用一致的高度、对齐、文字层级和控制关系。
- [x] RowShell 的选择、焦点、打开详情与 Context-menu target 状态彼此可辨，并继续与 Command Runtime、ActionBar 和直接快捷键使用同一目标合同。
- [x] TaskBoard 的虚拟滚动、分组、折叠、sticky header、分页占位、测量高度、滚动定位与容器查询行为不因视觉迁移改变。
- [x] Command、Menu 与 Popover 保留搜索、快捷键、禁用原因、危险动作、Overlay 行为及焦点恢复；打开 ContextMenu 不改变既有选择。
- [x] Task Detail 的 Aside、Sheet 与完整页继续共享同一 URL、草稿、自动保存和详情状态，只统一容器视觉。
- [x] Settings 与 Launcher 不建立页面私有主题；Main 与 Launcher 在默认及非默认 Accent 下呈现一致的视觉基线。
- [x] 产品表面不残留重复原始颜色、按 Accent 标识分支或针对单页打补丁的通用控件样式。
- [x] 现有路由、键盘、选择、Overlay、详情、虚拟化与 Launcher 生命周期测试继续通过。

## Review record

- Shell、Filter/Display、Metadata、Settings 与 Launcher 删除了会盖过公共 HeroUI recipe 的颜色、边框、圆角、阴影及状态 utility；保留窗口命中区、宽度、截断、滚动与产品分组等必要几何。
- Task、Project 与 Lifecycle 统一复用 `RowShell`：row/header/gap 对齐为 `44/34/2px`，详情打开态由既有 `activeTaskId` 贯通，选择、键盘焦点与 Context-menu target 继续使用独立信号。
- TaskBoard 的 virtualizer、sticky/push layer、测量常量、分页、容器查询与单滚动视口未改；仅让真实 row/header CSS 与既有 `44/34px` 模型一致。
- Board 状态、Breadcrumb、Checkbox、Toast 与主区域 ContextMenu 迁到现有 HeroUI OSS/Pro；嵌套 ContextMenu 由回归测试保证先于全局菜单处理。
- 冷灰主题与六套 Accent 语义映射未改；“所有空间”的既有领域色只收敛到 `spaceVisuals.ts` 单一 owner，没有新增页面色值或 Accent 分支。

## Verification

- `bun run test:dom`：108 files / 451 tests 通过，覆盖路由、集合/选择、TaskBoard 虚拟化、Overlay、详情、设置与 Launcher 行为。
- `bun run test:scripts`：16 files / 150 tests 通过。
- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check` 与 `bun run check:animations` 通过；lint 仅保留仓库既有 warning。
- `bun run build` 通过；保留既有 BigInt target 与大 chunk warning。
- `git diff --check`、`git diff --cached --check` 通过；暂存区为空。
- `package.json` 与 `bun.lock` 未修改，哈希分别保持 `37e7c4fd…` 与 `497c2f17…`。
- 尚未执行真实 Tauri Main/Launcher 与完整 Accent 视觉走查；该项不由 jsdom 或构建替代，留待 Ticket 06 集成验收。
