# 统一产品验收

**Status:** planned

## 完成口径

2026-08-24，任务发起人确认：既有重构任务以“代码、文档与自动化门禁已落地”为完成口径，真实应用、设备、缩放与签名包验收统一移入本工作包。下列项目尚未执行，不构成已经通过的证据，也不再阻塞原任务归档。

验收中发现的问题必须新建独立修复任务；不得修改或重新打开已归档任务来承载新问题。

## 前置工程证据

- [UI 系统生产迁移](../archive/ui-system-production-migration/spec.md)已完成并归档。已提交实现范围为 `4eda8e8d..43ffe860`（Ticket 01：`9761aac3`；Ticket 02～05：`43ffe860`）；Ticket 06 的清理与本节归档记录由同一最终差异持有，不记录自引用的未来提交号。
- 自动化准备证据：`bun run check`、`bun run build` 与 `git diff --check` 通过；前端 188 个文件共 932 项、脚本 160 项、Rust 233 项通过，7 项 PostgreSQL 集成测试因未提供数据库按既有条件忽略；生产构建不包含 `ui-lab.html`。
- 本轮影响下方既有验收项 1～6；第 7～9 项没有受到 UI 迁移影响。该记录只证明工程前置完成，所有九项仍按实际设备与环境结果勾选。
- [UI Lab 全量清单与 HeroUI 原生实现对齐](../archive/ui-lab-native-alignment/spec.md)已完成并归档目录、隔离对照、HeroUI 漂移门禁、十四批人工审查与生产构建边界；生产产物仍只有 Main/Launcher，且没有新增依赖。人工审查中已按明确反馈修改若干生产视觉与局部交互路径，最终差异审计未发现仍待实施的批准项；追加的真实应用验收输入落在既有第 1～6 项，第 7～9 项不受影响，九项均保持未勾选。

## 待统一验收

- [ ] 在真实 macOS Tauri Main 与 Launcher 完成冷启动、重启、六色 Accent 切换与跨窗口一致性检查，确认无可见默认色闪烁。
- [ ] 覆盖主要任务路径、Settings、Sync、Update、About、Changelog、空态、错误与危险操作；检查键盘、Focus-visible、VoiceOver、reduced-motion 和 Launcher 全局快捷键生命周期。
- [ ] 在真实 macOS WKWebView 与 Windows WebView2 验证主内容、TaskBoard 与详情的滚轮、触控板、scrollbar thumb、PageUp/PageDown、Home/End；复核长列表、折叠、sticky、续页占位及内容长短变化。
- [ ] 在 Settings 真实验证 NumberField 输入/步进/Enter/focus-exit、八个 CellSwitch 的整行点击与 Space 激活、默认 Space CellSelect 的 Popover/pending/失败反馈；验证 PageFrame Toolbar 的 Tab、左右方向键、Enter 与 Space。
- [ ] 在真实 Launcher 验证 Calendar Popover 的键盘选择、Escape、外点关闭与窗口边界；在主应用验证 Calendar Modal 的保存、取消、移除、Escape、焦点恢复，以及 Command、ContextMenu 和任务详情入口。
- [ ] 覆盖 `1024px` Shell/详情分流、`560px` TaskBoard 容器、最小窗口、常见窗口宽度及 `100%`/`125%` 缩放；Windows 设备只记录实际执行过的结果。
- [ ] 从 Standalone 与 Project 各创建并重开一个 Saved View，核对 scope、context、base view 与 filters；同时检查 Default View 即时反馈及 clean/dirty FilterBar。
- [ ] 在隔离 Git/R2 与签名配置中完成 macOS 签名更新包的检查、下载、断网安装、失败重试和完成 marker 验证，不推进生产 Pointer。
- [ ] 在隔离环境完成 Windows 后继 Beta 直接发布与更新场景，不补发旧平台版本、不推进生产 Pointer。

## 证据边界

- 自动化、Debug App 抽查和静态扫描只能作为准备证据，不能替代对应真实设备或签名包步骤。
- 每项只记录实际设备、环境、路径、结果与问题；未执行项保持未勾选。
- 验收结论统一收口后，本工作包再移入 `.scratch/archive/`。
