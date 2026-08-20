# 06 — 完成六色与真实应用验收

**What to build:** 用户可以在真实 StoneFlow 桌面应用中稳定使用新的 Light 视觉系统和六个 Accent，并有清楚的自动化与人工证据证明可访问性、跨窗口一致性和既有行为没有回归。

**Blocked by:** 05 — 删除旧视觉轨道并修订架构真相

**Status:** ready-for-agent

- [ ] 类型检查、Lint、格式检查、模块边界、第一方动效扫描、相关 DOM/单元测试、Shell Theme Sync 检查和生产构建全部通过。
- [ ] 对唯一主题值源中的实际文字、控件、选中边界与 Focus 配对完成对比度审计：普通文字至少 `4.5:1`，大文字与关键非文本指示至少 `3:1`。
- [ ] 默认钴蓝在 Shell/Sidebar、MainCard/PageFrame、TaskBoard/RowShell、Command/Menu/Popover、Modal/Sheet/Detail、Settings/Form 与 Launcher 上完成全部适用状态矩阵验收。
- [ ] 海洋蓝、烟紫、松柏、梅紫和石墨分别抽查主要动作、Selected/Soft、Link、Focus，以及与固定 Info、Success、Warning、Danger 的区分。
- [ ] 真实应用 Smoke 覆盖冷启动 Main、打开 Launcher、切换一次非默认 Accent、再次打开 Launcher、重启应用并确认两处一致且没有默认 Accent 闪烁。
- [ ] 键盘导航、Focus-visible、reduced motion、常见窗口宽度以及 `100%`/`125%` 缩放下的高密度布局完成最小人工检查。
- [ ] 真实应用验收同时确认 Sidebar 响应式合同、TaskBoard 几何、选择目标、ContextMenu、详情 Aside/Sheet、自动保存与 Launcher 生命周期未回归。
- [ ] 验收记录清楚区分自动化已覆盖、人工已验证和仍待用户确认的项目；未执行真实 Tauri Smoke 时不得宣称桌面或视觉验收通过。
- [ ] 不为本次验收新增 Storybook、className 快照、截图回归基础设施、TypeScript 调色板镜像或 Rust 测试。
