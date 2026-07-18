# StoneFlow 前置阶段B 业务全量清理与完整 UI 壳保留方案

## 1. 摘要

本阶段目标不是实现新数据模型，也不是继续重构 Rust workspace，而是把当前项目中仍然残留的旧业务实现彻底清空，同时完整保留现有 UI 的视觉风格、布局骨架、页面结构与交互外壳。

前置阶段 A 解决的是“后端架构基座干净”。  
前置阶段 B 解决的是“前后端旧业务内容干净，但 UI 壳完整保留”。

阶段 B 完成后，项目应处于以下状态：

- Tauri 主应用仍可启动
- Shell / Header / Sidebar / Main / Drawer / Quick Capture 的 UI 外观仍然存在
- 前端页面结构和视觉骨架不变
- 所有旧业务逻辑、旧业务命令、旧业务数据链路、旧业务 hook、旧业务测试被清空
- 项目回到一个“完整 UI 壳 + 干净宿主基座”的空心状态
- 后续阶段 0 可以在这套 UI 壳上重新接入新数据模型

---

## 2. 阶段定位

前置阶段 B 的本质不是“重做 UI”，而是：

> 保留 UI，清空业务。

因此本阶段的原则非常明确：

- 不改 UI 风格
- 不重做布局
- 不替换设计语言
- 不提前实现新模型
- 不为了兼容旧业务而继续保留空命令壳、空状态机或双轨逻辑

---

## 3. 范围定义

### 3.1 本阶段要做什么

1. 删除前端所有旧业务 feature、旧业务 API、旧业务 model、旧业务 hook。
2. 删除后端所有旧业务命令和仅用于兼容旧前端调用面的业务占位壳。
3. 保留完整 Shell UI 骨架和页面外观。
4. 将原有业务页面替换成统一的“基座占位页面”或“静态壳页面”。
5. 保留 Quick Capture 页面外观，但不再承载真实业务提交语义。
6. 保留设置页与基础壳层页面。

### 3.2 本阶段不做什么

1. 不实现新数据模型。
2. 不创建新的数据库 schema。
3. 不写新的 repository / entity / migration baseline。
4. 不恢复 Inbox / Focus / Project / Trash / Search / Task Drawer 的真实业务能力。
5. 不调整现有 UI 风格、配色、版式和设计语言。

---

## 4. 设计原则

### 4.1 完整 UI 壳保留

保留：

- `ShellLayout`
- `Header`
- `Sidebar`
- `Main card`
- `Drawer` 外形
- `Quick Capture` 外形
- `Settings` 页面外形
- 所有共享 UI primitive 和样式体系

不保留：

- 任何依赖旧业务数据才能成立的真实内容页逻辑
- 任何旧模型驱动的交互联动
- 任何继续假装“功能可用”的过渡层

### 4.2 UI 与业务彻底分离

本阶段后，UI 只能表达：

- 页面结构
- 视觉风格
- 路由层级
- 交互容器
- 占位内容

本阶段后，UI 不再表达：

- 旧 Task 数据
- 旧 Project 树
- 旧 Focus 视图
- 旧 Trash 恢复逻辑
- 旧 Search 搜索结果
- 旧 Drawer 详情数据

### 4.3 KISS

阶段 B 不允许出现：

- 新的兼容桥接层
- 旧业务 API 的空实现链路
- 旧 feature 保留一半、删除一半的模糊状态
- “先留着，后面也许能复用”的业务残料

---

## 5. 后端清理方案

## 5.1 后端最终保留范围

后端只保留以下内容：

### `src-tauri` 根宿主

- `src-tauri/src/main.rs`
- `src-tauri/src/lib.rs`
- `src-tauri/Cargo.toml`
- `src-tauri/Cargo.lock`
- `src-tauri/build.rs`
- `src-tauri/tauri.conf.json`
- `src-tauri/capabilities/default.json`
- `src-tauri/helper-bin/*`
- `src-tauri/icons/*`

### workspace crate 边界

- `crates/core`
- `crates/entity`
- `crates/migration`
- `crates/ipc-protocol`
- `crates/helper-app`
- `crates/test-support`
- `crates/desktop-app`

说明：

- `core` 仅保留技术基础能力
- `entity` 仅保留占位 crate
- `migration` 仅保留占位 crate
- `ipc-protocol` 保留 helper 协议 DTO
- `helper-app` 保留最小 helper 壳
- `test-support` 保留测试基座

### `desktop-app` 最终最小集合

保留：

- `src-tauri/crates/desktop-app/src/lib.rs`
- `src-tauri/crates/desktop-app/src/app/mod.rs`
- `src-tauri/crates/desktop-app/src/app/error.rs`
- `src-tauri/crates/desktop-app/src/app/state.rs`
- `src-tauri/crates/desktop-app/src/app/commands/mod.rs`
- `src-tauri/crates/desktop-app/src/app/commands/workspace.rs`
- `src-tauri/crates/desktop-app/src/app/commands/quick_capture.rs`
- `src-tauri/crates/desktop-app/src/domain/mod.rs`
- `src-tauri/crates/desktop-app/src/infrastructure/mod.rs`
- `src-tauri/crates/desktop-app/src/infrastructure/runtime.rs`
- `src-tauri/crates/desktop-app/src/tests/mod.rs`
- `src-tauri/crates/desktop-app/src/tests/runtime_tests.rs`

### `desktop-app` 最终命令面

保留命令：

- `healthcheck`
- `set_active_space`
- `restore_main_window`
- `quit_stoneflow`
- `get_command_helper_status`

可选保留：

- `create_space`

默认建议删除：

- `create_project`
- `list_projects`
- `get_project_execution_view`
- `update_project_task_status`
- `delete_project_to_trash`
- `create_task`
- `create_capture_task`
- `list_inbox_tasks`
- `triage_inbox_task`
- `list_focus_views`
- `get_focus_view_tasks`
- `update_task_pin_state`
- `list_task_resources`
- `create_task_resource`
- `open_task_resource`
- `delete_task_resource`
- `get_task_drawer_detail`
- `update_task_drawer_fields`
- `delete_task_to_trash`
- `list_trash_entries`
- `restore_task_from_trash`
- `restore_project_from_trash`
- `search_workspace`

## 5.2 后端要删除的内容

1. 所有业务占位命令文件。
2. 所有仅为旧前端 feature 保留的 DTO 壳。
3. 所有旧业务 command handler 注册项。
4. 所有与 Project / Task / Focus / Trash / Resource / Drawer / Search 相关的业务入口。
5. 所有与旧业务页面对接的后端测试。

---

## 6. 前端清理方案

## 6.1 前端最终保留范围

前端保留：

- `src/app/*`
- 所有 Shell 布局骨架
- Header / Sidebar / Main / Drawer 的 UI 结构
- shared UI primitives
- styles / tokens / 通用样式体系
- `features/quick-capture`
- `features/settings`
- `features/space`
- `features/healthcheck`

## 6.2 前端建议删除的业务 feature

建议整组删除：

- `src/features/focus`
- `src/features/inbox`
- `src/features/project`
- `src/features/task-drawer`
- `src/features/trash`
- `src/features/global-search`

建议大幅收缩：

- `src/features/task`

其中以下内容默认删除：

- 旧业务 API
- 旧业务 model
- 旧业务 hook
- 旧业务状态同步
- 旧业务联动测试

---

## 7. 页面与路由收口方案

## 7.1 路由目标

阶段 B 后，路由不应再以旧业务页为默认主入口。

建议改成：

- `/quick-capture`
- `/`
- `/space/:spaceId`
- `/space/:spaceId/settings`

### 默认入口

当前默认入口若仍是：

- `/space/work/inbox`

则应改为：

- `/space/personal`
或
- `/space/:spaceId`

并显示统一的 `WorkspaceBasePage` 占位内容。

## 7.2 页面壳保留方式

### Workspace 主内容区

不再展示：

- Inbox 业务列表
- Focus 业务视图
- Project 执行页
- Trash 业务页

统一替换为：

- `WorkspaceBasePage`

该页面只负责：

- 保持主内容区视觉结构
- 保持 card、标题、描述、空状态布局
- 明确提示“业务已在前置阶段 B 清理，阶段 0 将重新接入新模型”

### Drawer

保留：

- 抽屉外形
- 打开/关闭交互壳

清理：

- Task 详情获取
- Task 资源区逻辑
- 保存逻辑
- 删除逻辑

### Quick Capture

保留：

- 页面外观
- 输入框布局
- 按钮布局
- 错误提示位置

清理：

- 真实任务创建链路
- helper 侧业务提交语义

处理方式：

- 提交按钮禁用
或
- 点击后显示“阶段 B 为 UI 壳保留阶段，功能将在后续阶段接回”

### Settings

保留：

- 页面 UI 完整壳
- 现有视觉结构

可选：

- 保留静态设置项
- 或统一改为只读壳

---

## 8. Shell 导航收口方案

阶段 B 的关键不是删掉 Shell，而是让 Shell 不再继续承载旧业务入口。

### Sidebar 保留

保留：

- Space 切换 UI
- 导航区域外观
- Footer 区域外观

### Sidebar 清理

默认建议隐藏或替换为占位跳转：

- Inbox
- Focus
- Trash
- Project 相关入口

建议方案：

- 导航项可以保留文案和视觉位置
- 但统一跳转到 `WorkspaceBasePage`

这样用户仍看到完整产品壳，但不会再进入旧业务页。

### Header 保留

保留：

- 顶部导航骨架
- 搜索框外观
- Avatar
- 通用操作区

### Header 清理

清理：

- Global Search 真实搜索逻辑
- New Task 真实创建逻辑
- 与旧业务状态同步的联动

建议：

- 搜索框保留 UI，不出真实结果
- New Task 入口可隐藏或替换为占位反馈

---

## 9. 执行顺序

建议按以下顺序执行：

1. 收缩后端命令面，只保留基座命令。
2. 删除前端旧业务 API、hook、model。
3. 删除前端旧业务 feature 目录。
4. 收缩路由，移除旧业务页默认入口。
5. 增加统一 `WorkspaceBasePage` 占位页。
6. 收缩 Shell 导航，使旧业务入口不再指向真实业务页。
7. 保留 Quick Capture 与 Settings 的 UI 壳。
8. 清理相关测试、死引用、死代码。
9. 跑前后端完整编译与测试回归。

---

## 10. 验收标准

阶段 B 完成后，必须满足：

### 后端

- 后端不再保留任何旧业务命令壳
- 后端只保留宿主、helper、IPC、最小状态和最小命令面
- `desktop-app` 不再携带 Project / Task / Focus / Trash / Search / Drawer 业务入口
- workspace 结构仍完整

### 前端

- UI 风格与布局骨架保持不变
- Shell / Header / Sidebar / Main / Drawer / Quick Capture / Settings 仍可见
- 前端不再保留旧业务 API / hook / model
- 前端不再进入旧业务内容页
- 主内容区使用统一的静态基座页或占位页承接

### 工程

- 项目可启动
- 路由可正常进入
- 无旧业务 feature 死引用
- 无多余兼容层
- 无双轨状态
- 无“看起来删了，实际上命令壳还留着”的残料

---

## 11. 阶段 B 交付结果

前置阶段 B 的最终结果应被定义为：

> 一套完整保留 UI 视觉壳、但已彻底清空旧业务实现的前后端空心基座。

换句话说：

- 用户看到的仍然是 StoneFlow
- 开发者面对的已经不是旧 StoneFlow 的业务代码
- 后续阶段 0 将在这套壳上重新接入新数据模型和新业务语义

这就是前置阶段 B 的唯一目标。
