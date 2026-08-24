# 02 — 冻结代表性 Light 视觉合同

**What to build:** 用户能够在一组最小但完整的代表性表面上体验 StoneFlow 新的 Light-only 视觉语言，并在继续横切迁移前确认其密度、层级、排版和交互状态关系。

**Blocked by:** 01 — 贯通本机 Accent 选择

**Status:** completed; archived

- [x] 代表性样本覆盖 Shell/Sidebar、MainCard/PageFrame、TaskBoard/RowShell、Command/Menu/Popover、Modal/Sheet/Detail、Settings/Form 与 Launcher，每类只选择足以冻结公共合同的最小真实表面。
- [x] 视觉差异旋钮保持约 `4/10`：高保真借鉴 Linear 公开可见的信息层级、密度与交互关系，但不复制其私有源码、资产、字体、图标或不可验证 token，也不宣称像素级复刻。
- [x] 所有样本使用同一套低色度冷灰中性色、约 `8/10` 的桌面信息密度、约 `2/10` 的必要状态动效，以及适合中文扫读的排版层级。
- [x] 主内容与当前操作、领域元信息、退后导航三层视觉权重明确；表面优先通过间距、明度和必要弱边界分层，阴影仅用于确需 elevation 的场景。
- [x] 交互样本完整覆盖适用的 Rest、Hover、Pressed、Selected、Selected + Hover、Focus-visible、Selected + Focus-visible、Open、Disabled、Loading、Invalid/Danger 与 Context-menu target。
- [x] Selected、Open 与 Focus 保持为独立信号；指针 Hover 不伪装成 Focus，组合状态不会互相覆盖。
- [x] 小图标保持紧凑但不缩小命中目标；常用控件、普通文字、非文本边界与 Focus 指示满足相应对比度要求。
- [x] 六个 Accent 只通过共享语义角色改变样本中的主要动作、选择、链接与 Focus，不出现按组件或页面分叉的色值。
- [x] 样本验证不改变现有信息架构、路由、键盘行为、选择目标、TaskBoard 测量几何、详情状态或 Tauri 窗口生命周期。
- [x] 评审记录明确哪些关系成为全局语义值、哪些成为公共组件 recipe、哪些仍属于产品结构或动态几何，且不建立新的长期原型系统。

## Review record

- 全局语义值：`src/styles/theme.css` 统一拥有冷灰中性色、结构/控件边界、Focus、overlay 阴影与六套 Accent 角色。
- 公共组件 recipe：`src/styles/components.css` 统一拥有 Button、Card、Overlay、Sidebar、Menu 与 List 的表面及组合状态关系。
- 产品结构与动态几何：既有 Shell、Sidebar、TaskBoard/RowShell、详情和 Launcher 几何保持原主权；Task 的 Context-menu target 仅在 `TaskRowAdapter` 表达产品状态，不下沉到公共皮肤。
- 未建立 demo、gallery、兼容层或新抽象；代表面直接复用现有 HeroUI BEM/data-state 合同。

## Verification

- `bun run test:dom src/layout/ShellLayoutSkeleton.test.tsx src/layout/sidebar/SidebarNavRow.test.tsx src/features/task/components/TaskRowAdapter.test.tsx src/shared/components/row/RowShell.test.tsx`：4 files / 18 tests 通过。
- `bun test scripts/check-shell-theme-sync.test.ts`、`bun typecheck`、`bun lint`、`bun lint:boundaries`、Ticket 文件定向 `oxfmt --check` 与 `bun run check:animations` 通过；lint 仅保留仓库既有 warning。
- 冷灰实算：正文/页面 `12.85:1`、次要文字/页面 `6.71:1`、强控件边界/页面 `3.11:1`；六套 Accent 中最低的钴蓝 Focus/Selected Hover 为 `3.28:1`。
- `bun run build` 通过；保留既有 BigInt target 与大 chunk warning。
- `rustfmt --edition 2021 --check src-tauri/crates/runtime/src/window/main.rs` 与 `cargo check --manifest-path src-tauri/Cargo.toml -p stoneflow-runtime --lib` 通过。
- `git diff --check` 与 `git diff --cached --check` 通过。
- Rust 全量测试仍有一个与本 Ticket 无关的既有失败：重复删除回收站 Space 的错误文案断言。
- 尚未执行真实 Tauri Main/Launcher 冷启动与代表面视觉走查；该项不由自动门禁替代，留待 Ticket 06 集成验收。
