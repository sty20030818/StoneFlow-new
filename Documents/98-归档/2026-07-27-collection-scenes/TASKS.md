# Collection Scene 与页面框架重构 - Tasks

## 当前阶段

全部实现、自动验证与桌面/窄宽度视口验收已完成；本任务可冻结归档。

## Phase 0：冻结基线与迁移契约

- [x] 列出所有 PageFrame / `EntityScene` 调用方及其 Header、Toolbar、Body、Bulk Bar、Empty、Loading、Error 能力矩阵。
- [x] 为独立事项当前的单 `all` 分组纯行行为建立失败测试，再将预期改为状态分组 Board。
- [x] 为每种任务集合页面建立结构测试：所有任务、独立事项、View、项目详情。
- [x] 盘点 `layout` 的 schema、持久化、API、设置面板、归一化和测试引用，确定可一次 hard-cut 删除的完整清单。
- [x] 记录 Task Row、Preview、快捷键、选择和 Bulk Bar 的现有行为，作为迁移回归边界。

完成条件：后续阶段能以测试与检索判断是否完整迁移，不依赖截图或主观观察。

## Phase 1：建立纯 PageFrame

- [x] 将 `EntityScene` 的 Root/Header/Toolbar/Body/Footer/BulkBar 收口为无业务依赖的 PageFrame 原语。
- [x] 删除布局层对 `TaskBoardAdapter`、`ProjectBoardAdapter`、`LifecycleBoardAdapter` 的 import。
- [x] 删除 Toolbar 中筛选、展示、右侧面板的无功能默认按钮；未提供操作时不渲染该按钮。
- [x] 保留已有滚动、间距、可访问性标签和视觉 token，不进行无关视觉重画。
- [x] 为 PageFrame 的必经结构与可选操作区补组件测试。

完成条件：shared PageFrame 不 import 任一业务 Feature，且不再接受 `boardKind` 或实体 DTO。

## Phase 2：收口 Task Collection 能力

- [x] 在 task 域建立 Task Collection 的稳定 model / hook / UI 组合边界。
- [x] 将展示、筛选、选择、键盘焦点、Preview、Row action、Bulk Bar、状态和空态接线迁入该边界。
- [x] 删除 `TaskBoardAdapter` 的空 action fallback；将可见交互的 action 设为真实必填契约。
- [x] 删除 `HIDE_PROJECT_CELL_OPTIONS_VARIANTS`；改为显式的项目归属 capability。
- [x] 迁移所有任务和独立事项页面，默认使用状态分组 Board。
- [x] 删除 `TaskBoard` 对单个 `all` 分组隐藏 Board Header 的特判；无分组不是任务集合页面的默认展示路径。

完成条件：独立事项与所有任务使用同一 Task Collection 结构，页面差异只来自显式数据源与 capability。

## Phase 3：迁移 View 与项目详情

- [x] 将 View 的任务 run 接入 Task Collection，只保留 View 标签、编辑器、菜单和路由专属逻辑。
- [x] 将项目详情的任务区接入 Task Collection，只保留项目 Header、项目可见性空态和项目生命周期动作。
- [x] 删除 `useViewsScene`、`useProjectDetailScene` 中已迁移的任务展示、选择、preview、board DTO 重复 wiring。
- [x] 确认 View 与项目详情的创建默认值、项目归属编辑限制、Bulk action、Preview 和快捷键行为不变。

完成条件：四类任务集合页面不再构造 `EntitySceneTaskBoardConfig/Data/Actions`，任务 Board 的接线只有一个权威实现。

## Phase 4：迁移项目与生命周期集合

- [x] 以现有 `useProjectOverviewScene` 作为 Project Collection 的唯一编排边界，迁移项目总览的 Board、选择、批量操作、Empty/Loading/Error。
- [x] 以现有 `useLifecycleScene` 作为 Lifecycle Collection 的唯一编排边界，迁移归档和回收站的分组、选择、恢复、删除、永久删除和 Empty/Loading/Error。
- [x] 将两个集合页迁移至 PageFrame，保持各自实体与危险操作确认语义。
- [x] 删除 `ProjectBoardAdapter`、`LifecycleBoardAdapter`、`EntitySceneBoardSlotProps` 和相关 DTO。

完成条件：任务、项目、生命周期只在自己的 Feature 内渲染实体 Board；共享层只保留视觉框架。

## Phase 5：删除虚假展示布局

- [x] 从 display options schema、类型、默认值、归一化、API、存储和设置面板删除 `layout`。
- [x] 删除 layout 仅用于限制分组能力的分支与测试。
- [x] 将现有存量偏好处理为 hard-cut：读取时忽略旧字段，写入时不再产生该字段；不保留运行时兼容代码。
- [x] 为所有任务展示页面确认剩余设置只对应真实渲染能力。

完成条件：界面、类型、持久化与代码均不再出现无真实渲染器的 `list | board` 语义。

## Phase 6：验证、清理与文档同步

- [x] 检索确认 `EntitySceneBoardSlotProps`、`boardKind`、三个 `BoardAdapter`、空 action fallback、`HIDE_PROJECT_CELL_OPTIONS_VARIANTS` 与 `layout` 无生产残留。
- [x] 跑任务、项目、View、Lifecycle、展示设置和 PageFrame 的定向测试。
- [x] 运行根目录 `bun typecheck`、`bun lint` 和相关 Vitest 测试。
- [x] 用桌面与窄宽度视口检查 Header、Toolbar、Board、Bulk Bar 的层级、按钮可用性与文本不溢出。
- [x] 同步 SPEC 列出的长期架构文档；确认旧 `entity-scene` 描述不再声称自己是当前架构。
- [x] 将完成的任务目录移入 `Documents/98-归档/`，冻结 SPEC 与 TASKS。

完成条件：所有验收标准有代码、测试或检索证据；不存在“新 Collection Scene 与旧 EntityScene 并行长期保留”的双架构状态。

## 阻塞

无。

## 与 SPEC 的实施偏差

Project/Lifecycle 没有新增仅转发的 `*CollectionScene` wrapper；现有 `useProjectOverviewScene` 与 `useLifecycleScene` 已分别是各自实体唯一的高内聚编排边界。新增 wrapper 不会减少重复或耦合，因此按 KISS 保持现状。

## 完成记录

- 2026-07-27：`bun typecheck`、`bun lint`、feature-boundaries 通过；完整 Vitest 为 141 files / 734 tests passed。
- 2026-07-27：`bun format:check` 仍受既有 `src/features/sync/model/deriveSyncFooterView.ts` 格式问题影响，未修改该无关模块。
- 2026-07-28：运行中的 Tauri/Vite renderer 以只读 IPC mock 验收 `/#/all/standalone`；桌面与 `390x844` 窄宽度下 Header、Toolbar、空态、独立事项提示、Footer 均正常，`scrollWidth === viewportWidth`。
