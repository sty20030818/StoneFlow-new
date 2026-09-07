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
- [Row 与集合列表单轨架构改造](../archive/task-row-list-architecture/spec.md)按用户 2026-09-04 先修 UI Lab 超长测试、然后直接归档的授权完成工程收口，最终只保留 TanStack Virtual。UI Lab 长链路测试按行为拆分并保留原断言、恢复默认 timeout 后，单文件 26 项及连续两轮全量 `bun run test:run` 193 个文件、982 项通过。原始 macOS 实测证据随工作包归档；尚未执行的双平台、最低 WebView、原生交互、平台 trace、原始 React profiling 数据及长时内存/DOM 交接下方第 3 项，不记为通过。
- [StoneFlow 可靠性、性能与实现收敛](../archive/stoneflow-reliability-performance-hardening/spec.md)已完成并归档同步身份/rebind、详情 autosave 离开阻断、集合单投影、冷启动按需加载、bundle 预算与 release 供应链门禁；自动化结果见归档记录。下列真实远端、混合输入、WebView、detached install 与签名验收仍未执行，本条不表示任何对应验收已经通过。

## 待统一验收

- [ ] 在真实 macOS Tauri Main 与 Launcher 完成冷启动、重启、六色 Accent 切换与跨窗口一致性检查，确认无可见默认色闪烁。
- [ ] 覆盖主要任务路径、Settings、Sync、Update、About、Changelog、空态、错误与危险操作；检查键盘、Focus-visible、VoiceOver、reduced-motion 和 Launcher 全局快捷键生命周期。
- [ ] 在真实 macOS WKWebView 与 Windows WebView2（分别包含明确的最低支持版本）验证主内容、TaskBoard 与详情的滚轮、原生触控板 fling / 反向 fling、scrollbar thumb drag、PageUp/PageDown、Home/End；复核长列表、折叠、sticky、已加载内容高度、分页追加与失败 retry、真实产品 Context Menu 关闭及详情返回焦点。固定 production build、设备、WebView、viewport、seed、数据量与重复次数，保存两平台 scripting / style / layout / paint / 50ms long tasks 原始 trace、profiling build 的原始 React commit 数据、mounted Row / fetch 次数和长时进程内存/DOM 曲线，并记录人工跟手感；程序化输入不能替代原生输入证据。
- [ ] 在真实 Main 的虚拟 TaskBoard 与非虚拟 Project Overview / Lifecycle 集合中执行混合输入：把指针停在 Row A 后，用方向键、J/K、Home/End 将当前项移到 Row B，确认根 `data-focus-source` 保持 keyboard、只有键盘当前行显示焦点背景和 actions，Row A 不保留 stale pointer 背景或 actions；随后不移动指针，直接 pointerdown 任意 Row，确认 modality 立即恢复 pointer 且点击目标获得预期视觉与行为，不依赖逐 Row `pointermove`。
- [ ] 在真实 Main 分别覆盖宽屏 Aside 与窄屏 Sheet：修改 Task A 后制造 autosave 失败，依次尝试切换到另一 Row、详情关闭按钮、Sheet 的 Escape 与 backdrop dismiss、浏览器/路由 Back，以及显式进入 canonical 全页详情；确认每条离开路径都在原任务上被阻断，未保存草稿和可操作错误持续可见。恢复写入条件后执行重试，确认同一草稿成功保存、错误清除，并且原本意图的离开动作只继续一次。
- [ ] 用两套彼此独立的真实 PostgreSQL 远端 A/B 验证同步脱敏：首次连接、重连、失败和状态展示全过程不得在 UI、应用日志、诊断输出或验收附件中出现 URL authority / query 中的凭据；只记录非敏感 remote identity、cursor、outbox 数量与结果。
- [ ] 在真实远端 A 完成首次绑定并同步，再以同一绑定重连，确认 binding 与 cursor 连续；随后改连 B，确认 identity mismatch 在复用 cursor、上传 outbox 或清理本地状态前 fail closed，并且错误明确指向错绑而不暴露连接凭据。
- [ ] 分别验证显式 rebind 的两条路径：无 pending outbox 时经明确确认后从 A 重新绑定到 B，并从独立序列开始；存在 pending outbox 时 rebind 被阻断，原 binding、cursor、outbox 与本地草稿均不改变，且不会向 B 上传待发变更。
- [ ] 对 A/B 制造并发、逆序与相等 sequence 的增量响应，确认 remote identity 与 cursor/sequence 始终按远端隔离，任一远端都不能复用另一远端的 cursor，也不能让旧响应覆盖已提交的新状态。
- [ ] 制造一次同步中“前段成功提交变更、后段失败”的真实远端场景，确认成功提交对应的 change event / cache invalidation 对界面消费者可见，同时最终同步状态仍准确展示后续失败；重试后不得重复应用已提交变更。
- [ ] 对 production build 的真实 Main 与 Launcher 分别做全新进程冷启动并保存模块加载图；确认 Launcher 初始图不包含 Command、Activity、form、calendar，Main 初始图不包含其低频 overlays，且未打开功能前没有对应模块执行或副作用。
- [ ] 在真实 Launcher 首次展开 Advanced / Calendar，并在真实 Main 首次打开 About、Changelog、Update、Task Create、Project Create 与 Custom Date 等按需 overlay；逐一确认对应 chunk 仅在首次进入时加载、内容可见且可交互、初始焦点符合契约，Escape / 关闭按钮 / 支持外点关闭的路径正确关闭并把焦点还给触发器，关闭后重开无残留状态。
- [ ] 在 Settings 真实验证 NumberField 输入/步进/Enter/focus-exit、八个 CellSwitch 的整行点击与 Space 激活、默认 Space CellSelect 的 Popover/pending/失败反馈；验证 PageFrame Toolbar 的 Tab、左右方向键、Enter 与 Space。
- [ ] 在真实 Launcher 验证 Calendar Popover 的键盘选择、Escape、外点关闭与窗口边界；在主应用验证 Calendar Modal 的保存、取消、移除、Escape、焦点恢复，以及 Command、ContextMenu 和任务详情入口。
- [ ] 覆盖 `1024px` Shell/详情分流、`560px` TaskBoard 容器、最小窗口、常见窗口宽度及 `100%`/`125%` 缩放；Windows 设备只记录实际执行过的结果。
- [ ] 从 Standalone 与 Project 各创建并重开一个 Saved View，核对 scope、context、base view 与 filters；同时检查 Default View 即时反馈及 clean/dirty FilterBar。
- [ ] 在与正式 CI 等价的隔离环境中，使用真实 `HEROUI_AUTH_TOKEN` 从待发布 commit 建立 clean detached clone，执行 dependency audit、frozen install、release preflight 与最终 HeroUI artifact verification；日志和产物清单不得包含 token，安装结果必须是预期的私有 HeroUI Pro artifact 而非 public bootstrap，并核对版本、关键 exports 与运行时可加载性，同时确认已修复的 `tar` advisory 不再出现。
- [ ] 沿同一 detached release 路径生成真实签名产物，记录 commit、runner、依赖锁、artifact digest 与非敏感签名身份元数据；分别用平台原生工具验证 macOS codesign / notarization 与 Windows 签名完整性，任何缺少真实 CI token、签名身份或平台验证的模拟结果都不得勾选本项。
- [ ] 在隔离 Git/R2 与签名配置中完成 macOS 签名更新包的检查、下载、断网安装、失败重试和完成 marker 验证，不推进生产 Pointer。
- [ ] 在隔离环境完成 Windows 后继 Beta 直接发布与更新场景，不补发旧平台版本、不推进生产 Pointer。

## 证据边界

- 自动化、Debug App 抽查和静态扫描只能作为准备证据，不能替代对应真实设备或签名包步骤。
- 每项只记录实际设备、环境、路径、结果与问题；未执行项保持未勾选。
- 验收结论统一收口后，本工作包再移入 `.scratch/archive/`。
