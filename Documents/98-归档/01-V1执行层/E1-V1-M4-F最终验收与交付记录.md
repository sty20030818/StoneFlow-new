# E1 · V1 M4-F 最终验收与交付记录

> 最后更新：2026-04-22 · 当前版本：V1 · 适用范围：M4-F · `m4-f-final-validation-and-handoff`

## 文档目标

本文档用于承接 M4-F 的最终验收与交付硬化工作。它不新增 V1 业务能力，而是把 M4-A 到 M4-E 已完成的捕获主链路用可重复清单、自动化测试、真实 macOS 手工验证和已知限制记录下来，作为后续归档和继续开发的事实输入。

## 当前实现事实

- Quick Capture 由独立 Helper 进程承载，宿主目录为 `src-tauri/helper-bin`，业务库为 `src-tauri/crates/helper-app`。
- 主 App 负责数据库、共享创建用例、IPC Server、主窗口生命周期和任务变更事件。
- Helper 不持有数据库；Quick Capture 创建任务时通过 IPC 调用主 App。
- 默认系统级快捷键为 `Option+Space`，语义为 toggle：面板未打开时打开，已打开时关闭。
- Quick Capture 第一版只负责单输入框捕获，不做搜索、命令解析或自定义快捷键。
- Quick Capture 成功写入后，主 App 通过 `stoneflow://tasks/changed` 事件驱动可见页面刷新。
- 主 App 内已移除旧的 `open_quick_capture` 前端入口；应用外捕获以 Helper + 全局快捷键为准。

## 自动化与手工边界

| 类别 | 验收项 | 验收方式 | 记录要求 |
|------|--------|----------|----------|
| 自动化 | Quick Capture 输入、提交、失败、Space 回退、重复提交防护 | Vitest | 记录测试命令与结果 |
| 自动化 | Helper / IPC 错误映射、状态快照、主窗口 hide / quit 策略 | Rust 测试 | 记录测试命令与结果 |
| 自动化 | M4-E 任务变更事件、当前 Space 响应、非当前 Space 忽略 | Vitest | 记录测试命令与结果 |
| 手工 | `Option+Space` 全局唤起、连续触发 toggle、失焦隐藏 | macOS 真实桌面 | 记录通过、失败或已知限制 |
| 手工 | 主窗口隐藏时捕获、重新显示后读取新任务 | macOS 真实桌面 | 记录复现步骤与观察结果 |
| 手工 | 退出重启后 Helper 与快捷键恢复 | macOS 真实桌面 | 记录恢复结果和日志线索 |
| 手工 | 捕获后 Inbox、Search、Drawer、Project、Focus、Trash 承接 | macOS 真实桌面 | 记录完整端到端路径 |

## M4-F 手工验收清单

### 1. 启动与 Helper 可用性

| 步骤 | 操作 | 期望结果 | 结果 | 备注 |
|------|------|----------|------|------|
| 1.1 | 启动 StoneFlow 主 App | 主 App 正常显示，Helper 随主 App 启动 | 待执行 | 可结合日志确认 Helper spawn |
| 1.2 | 等待 1 秒后按 `Option+Space` | Quick Capture 面板显示并聚焦标题输入框 | 待执行 | 属于真实 macOS 验收 |
| 1.3 | 按 `Esc` | Quick Capture 隐藏，不创建任务 | 待执行 | 不应影响主 App 状态 |

### 2. 捕获写入与主应用刷新

| 步骤 | 操作 | 期望结果 | 结果 | 备注 |
|------|------|----------|------|------|
| 2.1 | 打开主 App 的 Inbox 页面 | 当前 Space 的 Inbox 可正常查询 | 待执行 | 记录当前 Space |
| 2.2 | 按 `Option+Space` 输入 `M4-F 手工捕获` 并回车 | Quick Capture 写入成功并关闭 | 待执行 | 若 Space 回退，记录反馈 |
| 2.3 | 回到主 App Inbox | 新任务出现在 Inbox，或页面重新挂载后可查询到 | 待执行 | 验证 M4-E 同步链路 |
| 2.4 | 在全局搜索中搜索 `M4-F 手工捕获` | 搜索结果可命中该任务 | 待执行 | 验证搜索承接 |
| 2.5 | 从搜索或 Inbox 打开任务 | Task Drawer 展示真实详情 | 待执行 | 验证 Drawer 承接 |

### 3. 整理与执行承接

| 步骤 | 操作 | 期望结果 | 结果 | 备注 |
|------|------|----------|------|------|
| 3.1 | 在 Inbox 中为捕获任务补齐 Project 与 Priority | 任务离开 Inbox | 待执行 | 沿用既有 Inbox 规则 |
| 3.2 | 进入对应 Project 页面 | 任务按 Project 执行规则出现 | 待执行 | 不复制前端规则 |
| 3.3 | 在 Project 或 Focus 中切换完成状态 | 行状态和反馈稳定，避免重复提交 | 待执行 | 验证 M4-E 行状态 |
| 3.4 | 删除任务到 Trash，再恢复 | 列表、Drawer 和 Trash 状态一致 | 待执行 | 验证删除/恢复承接 |

### 4. 生命周期与异常恢复

| 步骤 | 操作 | 期望结果 | 结果 | 备注 |
|------|------|----------|------|------|
| 4.1 | 连续按两次 `Option+Space` | 面板打开后关闭，不产生多个面板 | 待执行 | toggle 语义 |
| 4.2 | 主窗口隐藏时按 `Option+Space` 捕获 | 任务仍可写入，主窗口恢复后能查询到 | 待执行 | 验证主窗口隐藏路径 |
| 4.3 | 退出并重新启动 StoneFlow 后按 `Option+Space` | Helper 与快捷键恢复可用 | 待执行 | 若失败记录日志线索 |
| 4.4 | 临时设置 `STONEFLOW_HELPER_DISABLED=1` 启动主 App | 主 App 可用，Quick Capture 降级为不可用 | 待执行 | 可作为排障路径 |

## 自动化验证记录

| 命令 | 目标 | 结果 | 备注 |
|------|------|------|------|
| `bun run build` | TypeScript 与前端生产构建 | 通过 | Vite 保留 500 kB chunk warning，不阻塞本阶段 |
| `bun run test:run -- src/features/quick-capture/api/quickCaptureApi.test.ts src/features/quick-capture/ui/QuickCapturePage.test.tsx src/shared/events/taskChanged.test.ts src/features/global-search/ui/GlobalSearchInput.test.tsx src/features/task-drawer/model/useTaskDrawer.test.tsx src/features/inbox/ui/InboxPage.test.tsx src/features/project/ui/ProjectPage.test.tsx src/features/focus/ui/FocusPage.test.tsx src/features/task-drawer/ui/TaskDrawerContent.test.tsx` | 受影响前端链路 | 通过 | 9 个文件、53 个测试通过 |
| `cargo test --manifest-path src-tauri/Cargo.toml --workspace` | Rust workspace 测试 | 通过 | desktop-app 22 个、helper-app 1 个、ipc-protocol 3 个测试通过，doc tests 通过 |
| `openspec validate m4-f-final-validation-and-handoff --strict` | OpenSpec 变更校验 | 通过 | 变更规格有效 |

## 排障入口

| 现象 | 首查位置 | 恢复建议 |
|------|----------|----------|
| `Option+Space` 无反应 | Helper 启动日志、快捷键注册日志 | 确认主 App 已启动；检查快捷键是否被系统或其他应用占用；重启 StoneFlow |
| Quick Capture 显示但写入失败 | Quick Capture 面板错误文案、Helper `helper_create_task` 日志、主 App IPC 日志 | 保留输入后重试；检查主 App 是否仍在运行；查看 IPC 连接错误 |
| 任务写入默认 Space | Quick Capture 短反馈、主 App 当前 Space 状态 | 到默认 Space 的 Inbox 查找任务；检查当前 Space 是否归档或不可用 |
| 主窗口隐藏后看不到新任务 | 主应用重新显示、Inbox 正常查询、任务变更事件日志 | 手动刷新或重新挂载页面；若仍不可见，记录 Space 与任务标题 |
| 退出后 Helper 残留或不可恢复 | 主 App `RunEvent::Exit` 清理日志、进程列表 | 重启 StoneFlow；如复现，记录退出路径和进程状态 |

## 已知限制

- 当前 Codex 执行环境无法读取 macOS 进程列表或控制真实前台应用，`ps` 返回 `operation not permitted`，Computer Use 应用枚举返回 Apple Event 权限错误。因此本文档中的 `Option+Space` 真实桌面验收仍需用户在本机手工执行后回填结果。
- 第一版不支持用户自定义全局快捷键；`Option+Space` 冲突时只能通过系统或其他应用侧调整。
- 非 macOS 平台暂不提供 Quick Capture NSPanel 等价体验。
- 当前不做完整桌面 E2E 自动化，窗口激活、全局快捷键和跨进程生命周期以手工验收记录为准。
- 发布签名、安装包、登录项权限和正式分发流水线不在 M4-F 范围内。

## 本轮后续动作

- 用户需要在真实 macOS 桌面执行“ M4-F 手工验收清单”中的 1.1 到 4.4，并把每项结果回填为通过、失败或已知限制。
- 若真实 `Option+Space` 链路失败，优先记录：StoneFlow 是否已启动、是否有快捷键冲突、Quick Capture 是否显示、是否有错误反馈、主 App 是否能查询到任务。
- 若手工验收全部通过，可进入 OpenSpec archive 前检查；若存在阻塞级失败，应先在 M4-F 内补修复任务。

## M4-A 到 M4-F 交付事实

| 阶段 | 交付事实 |
|------|----------|
| M4-A | 捕获共享创建能力、当前 Space 解析与错误契约已建立 |
| M4-B | Quick Capture 独立浮窗输入、提交、关闭和反馈已建立 |
| M4-C | Helper 独立进程形态与主 App / Helper 边界已建立 |
| M4-D | `Option+Space` 全局快捷键和 toggle 重入语义已建立 |
| M4-E | 主应用任务变更同步、页面刷新、Drawer 与 Task Row 打磨已建立 |
| M4-F | 最终验收、运行态硬化、交付记录与归档输入由本文档承接 |

## 后续 archive 输入

- 若自动化验证和手工验收均通过，可将 M4-A 到 M4-F 作为 V1 捕获主链路完整交付输入。
- 若手工验收存在失败但不阻塞日常使用，必须在“已知限制”中保留复现信息。
- 若手工验收发现阻塞级缺陷，应先在 M4-F 内修复或新增后续 change，不应直接归档。
