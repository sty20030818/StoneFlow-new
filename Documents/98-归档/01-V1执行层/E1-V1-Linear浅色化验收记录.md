# E1 · V1 · Linear 浅色化验收记录

> 记录时间：2026-04-23

## 文档目标

本文件用于记录 StoneFlow `V1` 当前这轮 Linear 浅色化收口的验收事实，作为执行清单的补充依据。

---

## 本轮验收结论

当前可以确认：

- Linear 浅色化的页面级视觉收口已经完成
- 高频状态反馈、列表卡片、信息块已经回到共享语义层
- 工程校验已经全部通过，且 `lint` warning 已清零
- 深色主题本轮不继续治理，维持现状，后续单独设计

当前仍保留的事项：

- 无

---

## 已验收事实

### 1. 共享视觉语义

本轮已新增并接入以下共享语义层：

- `src/shared/ui/StatusNotice.tsx`
- `src/shared/ui/linearSurface.ts`
- `src/shared/ui/badgeSemantics.ts`

作用：

- 统一 `success / warning / danger / neutral` 软状态块
- 统一列表卡片、空态块、active / done / hover 状态
- 统一 `Badge` 的 `primary / success / warning` 语义，以及项目状态与执行状态映射
- 避免页面内继续复制零散 `soft success / soft danger` 容器类名

### 2. 页面与模块收口

以下页面 / 模块已按当前 Linear 浅色系统复查并收口：

- `InboxPage`
- `FocusPage`
- `ProjectPage`
- `TrashPage`
- `ShellSidebar`
- `ListItem`
- `TaskCreateModalContent`
- `ProjectCreateModalContent`
- `TaskDrawerContent`

### 3. 工程校验

本轮实际通过：

- `bun run format:check`
- `bun run build`
- `bun run test:run`
- `bun run lint`

结果：

- `format` 通过
- `build` 通过
- `test` 通过，`27` 个测试文件、`108` 个用例全部通过
- `lint` 通过，`0 warnings / 0 errors`

---

## 逐页视觉验收

以下页面已完成逐页复查，并有对应代码 / 测试证据支撑：

### Inbox

- 标题区、说明文案、操作按钮节奏统一
- 列表项、空态、warning / success / error 容器已回到统一语义
- 验证依据：
  - `src/features/inbox/ui/InboxPage.tsx`
  - `src/features/inbox/ui/InboxPage.test.tsx`

### Focus

- Tabs、摘要卡、任务列表、空态与错误态节奏统一
- active / done / hover / pin 操作保持一致
- 验证依据：
  - `src/features/focus/ui/FocusPage.tsx`
  - `src/features/focus/ui/FocusPage.test.tsx`

### Project

- 项目摘要、子项目入口、待执行 / 已完成分区视觉语法一致
- 任务行状态与 Inbox / Focus 共用同一套卡片语义
- 已完成 badge 已统一回到 soft success，active 状态 badge 改回主题色
- 验证依据：
  - `src/features/project/ui/ProjectPage.tsx`
  - `src/features/project/ui/ProjectPage.test.tsx`

### Shell

- Sidebar 与 Command 中的项目状态 badge 已统一语义
- `active` 显示为主题色 soft primary，`paused` 显示为 soft warning
- ShellDrawer 项目详情中的 `Active` 也已统一为主题色 soft primary
- Windows 标题栏最小化 / 最大化 / 关闭按钮已改为贴满 Header 高度，右侧不再预留多余空白，分割线也已加深
- 验证依据：
  - `src/app/layouts/shell/ShellSidebar.tsx`
  - `src/app/layouts/shell/ShellSidebar.test.tsx`
  - `src/app/layouts/shell/ShellHeader.tsx`
  - `src/app/layouts/shell/ShellHeader.test.tsx`
  - `src/app/layouts/shell/config.ts`
  - `src/app/layouts/shell/ShellMain.test.tsx`

### Trash

- 空态、恢复条目、成功 / 失败反馈容器已统一
- 恢复动作区视觉与主列表状态块一致
- 验证依据：
  - `src/features/trash/ui/TrashPage.tsx`
  - `src/features/trash/ui/TrashPage.test.tsx`

### Global Search

- 搜索输入区、分组标题、结果项、失焦收起与键盘打开路径已通过验收
- 浮层作为轻量悬浮层，保留统一 `rounded-xl` 壳层语义
- 验证依据：
  - `src/features/global-search/ui/GlobalSearchResults.tsx`
  - `src/features/global-search/ui/GlobalSearchInput.test.tsx`

### Quick Capture

- 结果态、创建态、成功反馈、错误反馈、优先级轮换已通过验收
- 浮层壳体与全局搜索 / Drawer 保持同一代际的浅色浮层语义
- 验证依据：
  - `src/features/quick-capture/ui/QuickCapturePage.tsx`
  - `src/features/quick-capture/ui/QuickCapturePage.test.tsx`

### Drawer

- 详情字段、资源区、删除区、状态反馈、Select overlay 行为已验收
- Drawer 自有 overlay 不会被主界面误关
- 验证依据：
  - `src/features/task-drawer/ui/TaskDrawerContent.tsx`
  - `src/features/task-drawer/ui/TaskDrawerContent.test.tsx`
  - `src/app/layouts/shell/ShellMain.test.tsx`

### Create Dialog

- Task / Project 创建弹窗标题、字段、状态提示、底部动作区节奏一致
- 验证依据：
  - `src/features/task/ui/TaskCreateDialog.test.tsx`
  - `src/features/project/ui/ProjectCreateDialog.test.tsx`

---

## 交互状态验收

### hover / focus / active / selected / disabled

已验收完成，依据如下：

- `linearSurface` 统一任务行与信息块的 `default / hover / active / done`
- 全局 `surface hover` 已加深一档，Shell 单独增加更强的 hover token 以提升 Sidebar 与窗口控制按钮的可感知性
- `button / badge / select / input / textarea` 基础组件统一 `focus-visible / disabled / invalid`
- `ShellMain.test.tsx` 验证 Drawer 外部点击与 overlay 关闭顺序
- `Inbox / Focus / Project / Global Search / Quick Capture` 测试覆盖选中、打开、关闭、失败保留、成功刷新等路径

### 空态 / 错误态 / 成功态

已验收完成，依据如下：

- `StatusNotice` 统一 `success / warning / danger / neutral`
- `Inbox / Focus / Project / Trash / TaskDrawer / Create Dialog` 已全部切到统一状态容器
- 对应测试均覆盖空态、错误态或成功反馈

---

## 残留样式终审

以下检索已完成终审：

### `rounded-xl`

当前仅保留在以下浮层壳层：

- `dialog`
- `command`
- `ShellDrawer`
- `GlobalSearchResults`
- `QuickCapturePage`

结论：

- 这些不是旧风格残留，而是当前统一的浮层半径语义
- 因此该项视为“已清洗完成，剩余均为设计上保留”

### `bg-background` / `bg-background/80`

当前仅保留：

- 全局 `body`
- `ShellLayout` 根容器

结论：

- 都是全局语义用法，不属于页面脏样式

### `border-border/70`

- 当前无残留

### `border-emerald*`

- 当前无残留

### `border-destructive*`

当前仅保留在：

- 基础组件 invalid / destructive 变体

结论：

- 都属于基础组件的表单错误态或 destructive 语义，不属于页面级散点样式

---

## Tauri 壳层静态审查结论

以下结论基于代码静态审查成立：

- `ShellHeader.tsx` 仍保留 `data-tauri-drag-region`，主窗口拖拽区未被本轮浅色化改动破坏
- `ShellHeader.tsx` 中窗口控制按钮仍走独立逻辑，Windows 关闭按钮平台例外策略未被本轮覆盖
- `TaskDrawerContent.tsx` 仍保留 `data-drawer-owned-overlay='true'`
- `ShellMain.test.tsx` 仍覆盖 Drawer 外部点击与 Drawer 自有 Select overlay 行为
- `ShellHeader.test.tsx` 已补充窗口控制按钮与拖拽区测试

说明：

- 本轮按“代码审查 + 自动化测试 + 壳层静态审查”完成收尾验收

---

## 本轮设计决策归档

### 深色主题策略

本轮明确结论：

- `Linear 浅色化` 只覆盖浅色主题
- 深色主题沿用当前状态，不在本轮继续治理
- 后续如果进入深色化，会作为单独设计与验收任务处理

### 收口边界

本轮只处理：

- 视觉语义统一
- 页面密度与状态收口
- 高频浮层与表单反馈一致性

本轮不处理：

- 业务逻辑重构
- 数据结构调整
- 深色主题重做
- 新功能扩展

---

## 后续剩余验收项

下一步应继续：

1. 后续如果进入封版前实机走查，可在桌面环境再做一轮人工点测
2. 深色主题如果立项，单独进入设计与验收流程
