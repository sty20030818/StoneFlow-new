# StoneFlow 统一 Scene 基建重构方案

## 摘要
重构目标调整为：

**全站只保留一套页面编排基建，`Task` 和 `Project` 只在 `Board` 层分叉。**

最终固定结构：

`Router -> SpaceLayout -> ShellLayout -> MainCard -> EntityScene -> BoardAdapter -> Board`

其中：
- `ShellLayout` 负责应用壳
- `MainCard` 负责页面骨架
- `EntityScene` 负责页面编排
- `BoardAdapter` 负责把页面配置翻译给具体 board
- `TaskBoard` / `ProjectBoard` 是仅有的主要实体差异点

这套结构用于统一：
- `Inbox`
- `All Tasks`
- `Views`
- `No Project`
- `Archive`
- `Trash`
- `Project Overview`
- `Project Detail`
- 后续 `View.entityType = task | project` 的所有新页面

## 关键改动

### 1. `app/layouts` 只保留一套通用页面基建
目录调整为：
- `src/app/layouts/shell/`
- `src/app/layouts/main-card/`
- `src/app/layouts/entity-scene/`
- `src/app/layouts/SpaceLayout.tsx`

规则：
- 不再建 `scenes/task/` 和 `scenes/project/` 两套目录
- 所有跨页面复用结构统一收口到 `entity-scene/`
- task / project 的差异只能通过配置和 board adapter 进入

### 2. `MainCard` 升级为稳定 compound API
重构现有 [MainCardLayout.tsx](D:/Desktop/StoneFlow-new/src/app/layouts/main-card/MainCardLayout.tsx)，统一暴露：
- `MainCard.Root`
- `MainCard.Header`
- `MainCard.Toolbar`
- `MainCard.Body`
- `MainCard.Footer`
- `MainCard.NoticeGroup`
- `MainCard.Section`
- `MainCard.Empty`

约束：
- 页面不再传 `header` / `toolbar` 大块节点
- 页面必须显式组合骨架
- header、toolbar、body、footer 的滚动与占位规则统一

### 3. 新建唯一的 `EntityScene`
新增 `src/app/layouts/entity-scene/`，核心组件：
- `EntityScene.Root`
- `EntityScene.Header`
- `EntityScene.Toolbar`
- `EntityScene.Filters`
- `EntityScene.Body`
- `EntityScene.Footer`
- `EntityScene.Empty`
- `EntityScene.BulkActions`
- `EntityScene.Notices`
- `EntityScene.BoardSlot`

职责：
- 统一页面头部
- 统一状态 tabs / pills
- 统一 bulk action 区
- 统一 footer 文案区
- 统一 empty/loading/error 呈现
- 统一 board 外层布局

差异只留给 `BoardSlot`。

### 4. `BoardSlot` 通过 adapter 切换 task / project
`EntityScene` 不直接依赖 `TaskBoard` 或 `ProjectBoard`，而是接一个 board adapter。

统一接口方向：
- `boardKind: 'task' | 'project'`
- `boardConfig`
- `boardData`
- `boardActions`

内部由：
- `TaskBoardAdapter`
- `ProjectBoardAdapter`

分别桥接到：
- `TaskBoard`
- `ProjectBoard`

约束：
- `EntityScene` 不知道 task/project 的具体渲染细节
- 页面也不直接摆 `TaskBoard` 或 `ProjectBoard`
- 页面只声明这是哪种 board、需要什么配置

### 5. 所有页面改成“容器页 + Scene 配置”
每个页面拆成两部分：

1. 容器页
- 负责取数
- 负责监听 store / route / query
- 负责组装 actions
- 负责决定 `boardKind`

2. scene 配置
- 标题
- breadcrumb
- toolbar actions
- tabs / pills
- empty 文案
- footer 文案
- bulk action 内容
- board config

页面本身禁止再手写：
- `MainCard + Toolbar + Board + Footer` 组合关系
- 页面级局部布局片段
- 实体专属的布局结构

### 6. 任务页与项目页的统一方式
统一结构，不统一数据语义。

任务页统一走：
- `EntityScene + boardKind='task'`

包括：
- `InboxPage`
- `AllTasksPage`
- `ViewsPage`
- `NoProjectPage`
- `Archive` 的 task 视图
- `Trash` 的 task 视图
- `ProjectDetail` 中的任务区域

项目页统一走：
- `EntityScene + boardKind='project'`

包括：
- `ProjectOverviewPage`
- `Archive` 的 project 视图
- `Trash` 的 project 视图
- 后续 project entity views

单项目详情页特殊点：
- 整页仍走同一套 `EntityScene`
- 只是当前页主体 board 为 task board，因为 detail 页本质上展示的是“某项目下的任务集合”
- 项目级动作、summary、breadcrumb 仍通过统一 header / toolbar / footer 插槽注入

### 7. `TaskBoard` 和 `ProjectBoard` 都收敛成纯展示层
`TaskBoard` 保留：
- section 渲染
- row 渲染
- 选择态
- 行动作
- 自定义空态插槽
- variant

`ProjectBoard` 保留：
- 项目卡片/行渲染
- 项目分组
- 项目状态展示
- 行动作
- 自定义空态插槽
- variant

二者共同禁止承担：
- 路由跳转
- drawer/dialog 打开策略
- 页面 toolbar
- 页面 footer
- 页面级查询来源
- 页面级筛选状态定义

### 8. `Archive` 和 `Trash` 改成多实体容器页
`ArchivePage` 和 `TrashPage` 不能继续做简单页面壳，必须升级为统一 scene 容器。

方式：
- 页面顶部结构复用 `EntityScene`
- 中间通过 tabs/pills 切换 `boardKind`
- 切换后挂不同 adapter
- 共享 header / toolbar / footer / notices / bulk actions 区域
- task/project 差异只落在 board slot

### 9. 兼容当前数据模型的策略
保持不变：
- `Task / Project / Space / View / Setting / Activity` 核心类型语义
- `View.entityType = 'task' | 'project'`
- `Inbox / No Project / Archive / Trash / Project Overview` 查询语义
- 现有 route path
- shell 层 stores 与 feature stores 的业务能力

允许变化：
- 页面目录结构
- 页面组件 API
- `MainCardLayout` 原有调用方式
- 任务页 / 项目页的具体拼装方式

## 公共接口与类型

### 1. `EntityScene` 接口
统一 scene 配置至少包含：
- `title`
- `breadcrumb`
- `headerActions`
- `toolbarActions`
- `tabs`
- `notices`
- `emptyState`
- `footer`
- `bulkActions`
- `boardKind`
- `boardConfig`
- `boardData`
- `boardActions`

### 2. `BoardAdapter` 接口
统一 adapter 输入至少包含：
- `variant`
- `items`
- `groups`
- `selection`
- `callbacks`
- `emptyState`
- `meta`

要求：
- `TaskBoardAdapter` 和 `ProjectBoardAdapter` 都实现同一输入契约
- scene 层不感知具体 board props 细节

### 3. 页面配置类型
新增统一配置类型，区分页面模式而不是写布尔 props。

推荐：
- `sceneVariant: 'inbox' | 'all-tasks' | 'view' | 'no-project' | 'archive' | 'trash' | 'project-overview' | 'project-detail'`
- `boardKind: 'task' | 'project'`

禁止：
- `isTask`
- `isProject`
- `isArchive`
- `isTrash`
- `isOverview`

## 测试与验收

### 1. 结构验收
- `app/layouts` 中只存在一套通用 scene 基建
- 任务页和项目页不再维护两套平行布局系统
- `TaskBoard`、`ProjectBoard` 成为页面内唯一主要实体差异点

### 2. 行为验收
- `Inbox / All Tasks / Views / No Project` 保持原筛选和交互
- `Project Overview / Project Detail` 保持原筛选和交互
- `Archive / Trash` 能在同一 scene 下切换 task/project 视图
- shell 下 drawer、dialog、scope 切换行为不回退

### 3. 复用验收
- 同一套 header / toolbar / footer / notices / bulk-actions 能同时服务 task 页和 project 页
- 新增一个 `entityType=project` 的 view 页面时，不需要再新造第二套 page scaffold
- 新增一个 task 类型页面时，只需写容器页和 scene 配置，不再拼 layout

### 4. 回归测试重点
- `ViewsPage` 的视图切换、排序、显示隐藏
- `ProjectPage` 的筛选、完成、归档、删除
- `ArchivePage` / `TrashPage` 的实体切换
- `MainCard` 的滚动、粘底 footer、toolbar 对齐
- `EntityScene` 对 loading / empty / error / ready 的统一渲染

## 假设与默认决策
- 默认接受破坏性重构，不保留旧 `MainCardLayout` 调用方式兼容层
- 默认全站只有一套 `EntityScene`
- 默认 `TaskBoard` 和 `ProjectBoard` 是主要差异点，其他页面结构全部复用
- 默认 `ProjectDetail` 视为“项目语义页面 + task board 主体”，不额外创造第三种 scene
- 默认后续所有 entity-based 页面都先接入 `EntityScene`，不允许再新增 task/project 平行页面骨架
