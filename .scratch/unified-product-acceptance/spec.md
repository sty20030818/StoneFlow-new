# 统一产品验收

**Status:** planned

## 完成口径

2026-08-24，任务发起人确认：既有重构任务以“代码、文档与自动化门禁已落地”为完成口径，真实应用、设备、缩放与签名包验收统一移入本工作包。下列项目尚未执行，不构成已经通过的证据，也不再阻塞原任务归档。

验收中发现的问题必须新建独立修复任务；不得修改或重新打开已归档任务来承载新问题。

## 待统一验收

- [ ] 在真实 macOS Tauri Main 与 Launcher 完成冷启动、重启、六色 Accent 切换与跨窗口一致性检查，确认无可见默认色闪烁。
- [ ] 覆盖主要任务路径、Settings、Sync、Update、About、Changelog、空态、错误与危险操作；检查键盘、Focus-visible、VoiceOver、reduced-motion 和 Launcher 全局快捷键生命周期。
- [ ] 覆盖 `1024px` Shell/详情分流、`560px` TaskBoard 容器、最小窗口、常见窗口宽度及 `100%`/`125%` 缩放；Windows 设备只记录实际执行过的结果。
- [ ] 从 Standalone 与 Project 各创建并重开一个 Saved View，核对 scope、context、base view 与 filters；同时检查 Default View 即时反馈及 clean/dirty FilterBar。
- [ ] 在隔离 Git/R2 与签名配置中完成 macOS 签名更新包的检查、下载、断网安装、失败重试和完成 marker 验证，不推进生产 Pointer。
- [ ] 在隔离环境完成 Windows 后继 Beta 直接发布与更新场景，不补发旧平台版本、不推进生产 Pointer。

## 证据边界

- 自动化、Debug App 抽查和静态扫描只能作为准备证据，不能替代对应真实设备或签名包步骤。
- 每项只记录实际设备、环境、路径、结果与问题；未执行项保持未勾选。
- 验收结论统一收口后，本工作包再移入 `.scratch/archive/`。
