# 06 — 完成六色与真实应用验收

**What to build:** 用户可以在真实 StoneFlow 桌面应用中稳定使用新的 Light 视觉系统和六个 Accent，并有清楚的自动化与人工证据证明可访问性、跨窗口一致性和既有行为没有回归。

**Blocked by:** 05 — 删除旧视觉轨道并修订架构真相

**Status:** completed; archived; manual acceptance transferred

- [x] 类型检查、Lint、格式检查、模块边界、第一方动效扫描、相关 DOM/单元测试、Shell Theme Sync 检查和生产构建全部通过。
- [x] 对唯一主题值源中的实际文字、控件、选中边界与 Focus 配对完成对比度审计：普通文字至少 `4.5:1`，大文字与关键非文本指示至少 `3:1`。
- [x] 默认钴蓝在 Shell/Sidebar、PageFrame、TaskBoard/RowShell、Command/Menu/Popover、Modal/Sheet/Detail、Settings/Form 与 Launcher 上完成全部适用状态矩阵验收，并确认 `6/8/12px` 圆角、`28/32/36px` 密度、结构边框与浮层阴影关系一致。
- [x] 海洋蓝、烟紫、松柏、梅紫和石墨分别抽查主要动作、Selected/Soft、Link、Focus，以及与固定 Info、Success、Warning、Danger 的区分。
- [x] 将 Main/Launcher 冷启动、Accent 切换、重启一致性与闪烁检查移入 [统一产品验收](../../../unified-product-acceptance/spec.md)；本工作包未执行该步骤。
- [x] 将键盘、Focus-visible、reduced-motion、窗口宽度及 `100%`/`125%` 缩放检查移入 [统一产品验收](../../../unified-product-acceptance/spec.md)；本工作包未执行该步骤。
- [x] 将 Sidebar、TaskBoard、ContextMenu、详情、自动保存与 Launcher 生命周期走查移入 [统一产品验收](../../../unified-product-acceptance/spec.md)；本工作包未执行该步骤。
- [x] 静态门禁确认页面不再重写 HeroUI 通用皮肤，`patterns`、旧 `base`、旧 token/shadcn adapter、Dark 与兼容 alias 已删除且没有回流。
- [x] 验收记录清楚区分自动化已覆盖、人工已验证和仍待用户确认的项目；未执行真实 Tauri Smoke 时不得宣称桌面或视觉验收通过。
- [x] 不为本次验收新增 Storybook、className 快照、截图回归基础设施、TypeScript 调色板镜像或 Rust 测试。

## Implementation record

- `theme.css` 继续是唯一视觉值源：中性强边界统一为 `--border-secondary: #808184`，字段边界直接复用该角色；Success 在全局状态角色校准，不给任务行增加局部颜色补丁。
- Switch 的关闭轨道与 Thumb 由唯一公共 recipe 增加语义边界，选中态继续消费 Accent；RowShell active 边界改用 `accent-border`。没有新增 token、组件 wrapper、兼容 alias 或测试基础设施。
- 最差实算：普通正文 `11.877:1`、muted/placeholder `6.205:1`；六色 Solid 文本 `4.733:1`、Soft 文本 `4.589:1`、Focus/Active 边界 `3.285:1`；字段/Switch 对 `surface-secondary` `3.513:1`，Todo 对六色 Selected Hover `3.058:1`，Success 图形对六色 Selected Hover `3.611:1`。

## Automated verification

- `bun run typecheck`、`bun run lint`、`bun run lint:boundaries`、`bun run format:check`、`bun run check:animations`、`git diff --check` 通过；Lint 仅保留仓库既有 React Compiler warnings。
- `bun run test:dom`：102 files / 435 tests；`bun run test:unit`：82 files / 441 tests；`bun run test:scripts`：17 files / 155 tests；Shell Theme Sync：1 file / 2 tests，全部通过。
- `bun run build` 通过，5647 modules；仅保留依赖侧既有 BigInt target 与大 chunk warning。没有 Rust 改动，因此未新增或运行 Rust 测试。

## Agent manual verification — macOS Debug App

- 实际 Debug App 冷启动、重启和主窗口均保持冷灰 Light；六个 Accent 在 Settings 可选择、可键盘切换并正确保存。使用梅紫重启后 Main 与实际 Launcher WebView/NSPanel 保持一致，抽样观察未见可见默认色或白色闪帧；验收结束已恢复钴蓝。
- 实际检查 Command Menu 的键盘焦点与 Escape 恢复、任务行 ContextMenu 打开/关闭且不改变选择、宽窗口详情 Aside、窄窗口详情 Sheet，以及 Launcher 的真实焦点、菜单 Arrow/Escape 和输入清理；未提交任务、未执行菜单动作、未编辑详情数据。
- Computer Use 无法发送系统级全局快捷键；Launcher 是在实际 Tauri Launcher 窗口中通过本地 QA 事件准备会话后检查，未把该路径当作 Rust 全局快捷键生命周期的端到端证据。

## Platform/user confirmation still required

以下项目同样已移入 [统一产品验收](../../../unified-product-acceptance/spec.md)，尚未执行：

- 在物理键盘上验证 macOS `Option+Space` 与 Windows `Alt+Space` 的完整 Launcher 打开、再次打开、失焦关闭生命周期。
- 在 Windows `125%` 系统缩放下复核 8px Launcher 原生圆角、紧凑布局与 Sidebar 响应式；当前 Mac 没有产品级精确 `125%` Zoom 入口。
- 在系统 reduced-motion 设置下做一次人工确认，并在需要逐帧证据时使用专门录制工具确认启动无闪帧；当前证据为静态门禁与肉眼抽样，不宣称逐帧测量。
