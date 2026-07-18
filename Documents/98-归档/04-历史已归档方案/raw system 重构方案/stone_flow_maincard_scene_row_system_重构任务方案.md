# StoneFlow MainCard / Scene / Row System 重构任务方案

## 0. 文档定位

这份文档用于约束 StoneFlow 本轮页面壳层与列表行系统的联合重构。

本次重构不是单独修 `TaskRow`，也不是只重写 `MainCard`。

本次目标是一次性稳定以下基础设施：

- `Shell` 之下的 `MainCard` 页面骨架
- `EntityScene` 页面编排层
- `Board / Group` 列表容器层
- `RowShell` 行壳层
- `Field Cell` 通用字段层
- `Task / Project / Lifecycle` 薄装配层

这套基建会成为 StoneFlow 后续以下页面的长期基础：

- `Inbox`
- `All Tasks`
- `Views`
- `No Project`
- `Project Overview`
- `Project Detail`
- `Archive`
- `Trash`
- `Settings`
- 后续新增实体列表页

---

## 1. 已确认决策

以下决策已由当前讨论锁定，后续实现默认按此执行：

1. `ShellLayout` 体系不动，继续作为应用壳。
2. `MainCard` 需要顺手一起重构，不只改 row。
3. `Task / Project / Archive / Trash` 全部压成单行 row 结构。
4. `Project` row 移除统计信息，不保留双行描述。
5. `Archive / Trash` 常驻动作只保留 `恢复`，`打开` 等其他动作移到详情或上下文菜单。
6. 右侧字段固定顺序按“从右往左”理解为：
   - `CreatedAt`
   - `Project`
   - `Reminder`
   - `Scheduled`
   - `Due`
   - `Tags`
7. `CreatedAt` 在 `Task / Project / Archive / Trash` 中统一显示。
8. `ProjectCell` 在项目详情页默认隐藏。
9. `Tags` 第一阶段只做占位接口，不接完整交互。
10. 不允许为 `task / project / lifecycle` 分三套 row token，必须只有一套统一 row token。
11. 通用字段组件不允许带 `task` 或 `project` 前缀，统一按功能命名。

---

## 2. 重构目标

### 2.1 产品目标

本轮重构后，StoneFlow 的页面和列表应具备以下体验：

- 页面骨架统一，Header / Toolbar / Board / BulkBar 关系固定。
- 列表行轻量、紧凑、稳定，不滑向重型表格。
- 勾选框 hover 显示但不造成布局抖动。
- 左侧结构稳定，右侧字段可插拔。
- 所有行内可交互字段统一使用相近视觉体系。
- `Archive / Trash` 行界面极简，不堆动作按钮。
- `Settings` 正式纳入 `MainCard` 体系，但不硬塞到 row system。

### 2.2 工程目标

本轮重构后，基础设施必须满足：

- **KISS**：先固定结构，不提前上 registry / table engine。
- **DRY**：统一 row 壳、按钮壳、field 壳、board 容器。
- **单一职责**：布局层不碰业务，field 不碰整行布局，adapter 只装配。
- **模块化**：任意 field 可独立增加、替换、删除。
- **可持续**：未来扩展标签、负责人、重复规则、子任务、归档时间时不推翻现结构。
- **性能稳定**：为未来虚拟列表和大数据量列表保留升级空间。

---

## 3. 非目标

本轮明确不做：

1. 不引入完整 `Cell Registry`。
2. 不引入 `TanStack Table` 或 column engine。
3. 不做用户自定义列系统。
4. 不做虚拟列表。
5. 不一次性重做所有 field 的完整交互能力。
6. 不把 `Settings` 页面强行转换成 `Board / Group / Row`。

---

## 4. 总体架构

最终结构固定为：

```txt
Router
  -> SpaceLayout
    -> ShellLayout
      -> MainCard
        -> EntityScene
          -> Board
            -> Group
              -> RowShell
                -> Field Cells
```

说明：

- `ShellLayout` 是应用壳，稳定，不承载页面业务。
- `MainCard` 是 main 区视觉骨架。
- `EntityScene` 是页面编排层。
- `Board / Group` 是列表容器层。
- `RowShell` 是单行壳层。
- `Field Cells` 是按功能命名的可插拔字段。

---

## 5. 分层职责

### 5.1 Layer 1：Shell

位置：

```txt
src/app/layouts/shell/
```

职责：

- app chrome
- sidebar
- shell header
- shell footer
- drawer 边界
- route 内容容器

禁止：

- `MainCard` 内部布局
- 列表页编排
- row 结构
- field 交互

### 5.2 Layer 2：MainCard

位置：

```txt
src/app/layouts/main-card/
```

职责：

- main 区 card 外壳
- page header 区结构
- page body 区结构
- header 左 breadcrumb / 右 actions 的固定语义

固定结构：

```txt
MainCard
├── Root
├── Header
└── Body
```

禁止：

- 业务列表结构
- task/project/lifecycle 差异
- field 级交互

### 5.3 Layer 3：EntityScene

位置：

```txt
src/app/layouts/entity-scene/
```

职责：

- 页面编排
- toolbar 区
- notices 区
- board header 区
- board slot
- bulk bar 区
- footer 区

推荐固定结构：

```txt
EntityScene
├── Header
├── Toolbar
├── Notices
├── BoardHeader
├── BoardSlot
├── BulkBar
└── Footer
```

说明：

- `EntityScene` 统一 task/project/list settings-like 页面编排。
- `Settings` 也进入 `MainCard + EntityScene`，但不进入 `Board / Row`。

### 5.4 Layer 4：Board / Group

位置建议：

```txt
src/shared/ui/board/
```

职责：

- 列表整体 loading / empty
- group 间距
- group 折叠
- group header
- group rows 容器

固定结构：

```txt
Board
├── Group
│   ├── GroupHeader
│   └── Rows
└── Group
```

禁止：

- 行字段排布
- 行内交互
- 业务 mutation

### 5.5 Layer 5：RowShell

位置建议：

```txt
src/shared/ui/row/
```

职责：

- 行级表面语义
- hover / active / selected / disabled / focus-visible
- selection 固定占位
- left / title / trailing / fixedTrailing 排布
- 行点击和键盘可达性基础支持

固定结构：

```txt
RowShell
├── SelectionSlot
├── LeadingSlot
├── TitleSlot
├── TrailingSlot
└── FixedTrailingSlot
```

### 5.6 Layer 6：Field Cells

位置建议：

```txt
src/shared/ui/row/fields/
```

这一层只按“功能”命名，不按“实体”命名。

第一阶段目标组件：

- `PriorityCell`
- `StatusCell`
- `IconCell`
- `TitleCell`
- `TagsCell`
- `DueDateCell`
- `ScheduledDateCell`
- `ReminderCell`
- `ProjectCell`
- `CreatedAtCell`
- `RestoreActionCell`

关键规则：

1. field cell 是公共组件，不带 `task` / `project` 前缀。
2. field cell 通过 props 接收值、选项、状态、回调。
3. field cell 不知道当前实体是不是 task/project/lifecycle。
4. 业务实体差异只留在 adapter。

---

## 6. 命名规则

### 6.1 统一术语

| 模糊称呼 | 正式称呼 | 说明 |
|---|---|---|
| raw | row | 列表行 |
| broad | board | 列表板块容器 |
| section | group | 分组 |
| row 外壳 | RowShell | 行壳 |
| 行内字段 | Cell | 单字段组件 |
| 业务装配器 | Adapter | 仅做装配 |

### 6.2 组件命名原则

允许：

- `RowShell`
- `RowSelectionCell`
- `RowMetaButton`
- `PriorityCell`
- `StatusCell`
- `DueDateCell`
- `ProjectCell`
- `CreatedAtCell`
- `TaskRowAdapter`
- `ProjectRowAdapter`
- `LifecycleRowAdapter`

禁止：

- `UniversalRow`
- `CommonBusinessRow`
- `TaskPriorityCell`
- `ProjectCreatedAtCell`
- `LifecycleRestoreButtonRowThing`

说明：

- 业务前缀只允许留在 adapter 层。
- field 层必须是真正公共能力。

---

## 7. RowShell 布局设计

### 7.1 布局模型

RowShell 推荐正式使用 CSS Grid：

```txt
Selection | Leading | Title | Trailing | FixedTrailing
```

推荐概念列：

```txt
grid-template-columns:
  selection-width
  auto
  minmax(0, 1fr)
  auto
  auto
```

原因：

1. checkbox hover 显示不抖动。
2. title 可稳定省略。
3. 右侧字段与最右时间不乱序。
4. future density / virtualization 更稳定。

### 7.2 左侧顺序

固定为：

```txt
Selection -> Priority -> Status -> Icon -> Title
```

规则：

- `Selection` 必有，永远占位。
- `Priority` 可选。
- `Status` 可选。
- `Icon` 可选。
- `Title` 必有。
- 没有 icon 时不强占位。

### 7.3 右侧顺序

按当前共识，固定为：

```txt
Trailing:
  Tags -> Due -> Scheduled -> Reminder -> Project

FixedTrailing:
  CreatedAt
```

说明：

- 这是为了满足“从右往左 CreatedAt / Project / Reminder / Scheduled / Due / Tags”。
- `CreatedAt` 永远固定在最右。
- 项目详情页中 `ProjectCell` 默认隐藏。

---

## 8. Row 交互规范

### 8.1 行点击

Row 本身点击用于：

- 打开详情
- 设置 active row
- 进入 drawer

### 8.2 Cell 点击

Cell 点击用于：

- 修改状态
- 修改优先级
- 修改日期
- 修改提醒
- 修改所属项目
- 修改标签
- 恢复归档 / 回收站对象

所有 cell 内交互元素必须阻止冒泡。

### 8.3 Archive / Trash

归档与回收站列表统一规则：

- 常驻只留 `RestoreActionCell`
- 不留 `打开`
- 不留 `删除`
- 不留多按钮堆叠
- 其他动作进入详情页或上下文菜单

---

## 9. RowMetaButton / RowActionButton

### 9.1 RowMetaButton

职责：

- 统一右侧元信息按钮外观
- 统一 `outline` 质感
- 统一 icon + label 间距
- 统一 active / muted / disabled 语义
- 默认阻止冒泡

用于：

- `ProjectCell`
- `DueDateCell`
- `ScheduledDateCell`
- `ReminderCell`
- `TagsCell`
- `CreatedAtCell`

### 9.2 RowActionButton

职责：

- 行内动作按钮壳
- 默认阻止冒泡

用于：

- `RestoreActionCell`
- 未来 `MoreActionCell`
- 未来 `ExpandActionCell`

规则：

- `MetaButton` 表示元数据展示/编辑。
- `ActionButton` 表示动作执行。
- 二者都不承载业务类型判断。

---

## 10. 公共 Field Cell 设计

### 10.1 设计原则

所有 field cell 必须满足：

1. 单个 cell 只负责一个字段。
2. 不包含整行布局代码。
3. 不引用具体实体类型。
4. 通过 props 接收业务值和事件。
5. 可以组合 `DropdownMenu` / `Popover` / `Calendar` / `Command`。
6. 打开复杂弹层时按需渲染。

### 10.2 推荐示例

```txt
DueDateCell
├── RowMetaButton
└── DatePickerPopover
```

```txt
ProjectCell
├── RowMetaButton
└── ProjectSelectDropdown
```

```txt
StatusCell
├── RowMetaButton
└── StatusDropdown
```

### 10.3 与 adapter 的关系

field cell 不知道“这是 task 还是 project”。

例如：

- `DueDateCell` 只知道当前有一个日期值与 `onChange`
- `ProjectCell` 只知道当前有项目名、可选项与 `onSelect`
- `RestoreActionCell` 只知道当前能否恢复、点击后做什么

实体语义由 adapter 翻译后传入。

---

## 11. Adapter 设计

Adapter 是本轮保留实体语义的唯一层。

位置建议：

```txt
src/features/task/ui/TaskRowAdapter.tsx
src/features/project/ui/ProjectRowAdapter.tsx
src/features/lifecycle/ui/LifecycleRowAdapter.tsx
```

职责：

- 把 task/project/lifecycle 数据翻译为 row slots
- 决定哪些 cell 显示
- 决定 `ProjectCell` 是否隐藏
- 决定 archive/trash 是否只显示 `RestoreActionCell`
- 绑定行点击与 drawer 打开策略

禁止：

- 复制 row 布局 class
- 内嵌复杂弹层实现
- 自己重新写按钮样式

### 11.1 第一阶段 adapter 规则

- `TaskRowAdapter` 使用完整字段链路
- `ProjectRowAdapter` 使用同一套字段，但去掉统计和双行描述
- `LifecycleRowAdapter` 仅使用适用字段，并常驻 `RestoreActionCell`

---

## 12. Settings 纳入方式

`Settings` 必须纳入 `MainCard + EntityScene`，但不纳入 `Board / Group / Row`。

固定规则：

- `SettingsPage` 继续使用 `MainCard`
- `SettingsPage` 进入统一 `EntityScene`
- `SettingsPage` 主体内容使用 `PanelStack / SectionPanel / FieldGroup`
- 不把设置项伪装成 row

理由：

- 页级协议应该统一
- 列表页协议不应误伤设置页

---

## 13. 统一 token 方案

本轮只允许一套 row token。

### 13.1 Row Surface Tokens

负责：

- height
- padding
- radius
- border
- hover background
- selected background
- active border
- focus ring

### 13.2 Row Layout Tokens

负责：

- selection width
- left gap
- trailing gap
- fixed trailing gap
- density
- title min width

### 13.3 Row Control Tokens

负责：

- meta button height
- control radius
- icon size
- label size
- icon-text gap
- muted / active / disabled state

### 13.4 禁止事项

禁止出现：

- `task-row-*`
- `project-row-*`
- `lifecycle-row-*`

允许存在的业务语义只应留在 cell 内容层，比如 overdue/warning 状态语义，而不是 row 壳 token。

---

## 14. 推荐目录结构

```txt
src/
├── app/
│   └── layouts/
│       ├── ARCHITECTURE.md
│       ├── shell/
│       ├── main-card/
│       └── entity-scene/
│
├── shared/
│   └── ui/
│       ├── board/
│       │   ├── board.tsx
│       │   ├── group.tsx
│       │   ├── group-header.tsx
│       │   ├── board-empty-state.tsx
│       │   ├── board-loading-state.tsx
│       │   └── index.ts
│       │
│       └── row/
│           ├── row-shell.tsx
│           ├── row-selection-cell.tsx
│           ├── row-title-cell.tsx
│           ├── row-meta-button.tsx
│           ├── row-action-button.tsx
│           ├── row.types.ts
│           ├── fields/
│           │   ├── priority-cell.tsx
│           │   ├── status-cell.tsx
│           │   ├── icon-cell.tsx
│           │   ├── due-date-cell.tsx
│           │   ├── scheduled-date-cell.tsx
│           │   ├── reminder-cell.tsx
│           │   ├── project-cell.tsx
│           │   ├── created-at-cell.tsx
│           │   ├── tags-cell.tsx
│           │   ├── restore-action-cell.tsx
│           │   └── index.ts
│           └── index.ts
│
├── features/
│   ├── task/
│   │   └── ui/
│   │       └── TaskRowAdapter.tsx
│   ├── project/
│   │   └── ui/
│   │       └── ProjectRowAdapter.tsx
│   ├── lifecycle/
│   │   └── ui/
│   │       └── LifecycleRowAdapter.tsx
│   └── settings/
│       └── ui/
│           └── SettingsPage.tsx
│
└── styles/
    └── tokens/
```

说明：

- 不新增 `entities/` 顶层，保持当前仓库以 `features` 为主的术语。
- adapter 留在 feature。
- row / board / field 的公共基建进入 `shared/ui`。

---

## 15. 实施阶段

### P0：冻结边界与术语

目标：

- 统一术语
- 冻结层级关系
- 补足架构文档

任务：

- 固定 `MainCard -> EntityScene -> Board -> Group -> RowShell` 结构
- 固定 field 按功能命名
- 固定 `Settings` 纳入方式
- 固定统一 token 原则

产出：

- 本文档
- `src/app/layouts/ARCHITECTURE.md`

### P1：重构 MainCard 与 EntityScene

目标：

- 先稳定页级骨架

任务：

- 收紧 `MainCard` compound API
- 明确 `EntityScene` 固定插槽
- 让 `SettingsPage` 纳入新 `MainCard + EntityScene`

验收：

- 主页面骨架统一
- 设置页也走同一页级协议
- 页面不再直接手写散乱 `MainCard + Toolbar + Body` 组合

### P2：抽 Board / Group 基建

目标：

- 把 row 责任从现有 board 实现中分离

任务：

- 建 `Board`
- 建 `Group`
- 建 `GroupHeader`
- 建 loading / empty state

验收：

- board 不再知道 row 内部结构
- group header 与 row 解耦

### P3：建立 RowShell 与统一 field 壳

目标：

- 建立真正统一的 row 基础设施

任务：

- `RowShell`
- `RowSelectionCell`
- `RowTitleCell`
- `RowMetaButton`
- `RowActionButton`
- 基础 row token

验收：

- checkbox hover 显示不抖
- 最右 `CreatedAt` 稳定贴边
- 行点击与 cell 点击不冲突

### P4：建立功能型 field cells

目标：

- 用公共字段能力替换 task/project 专属命名 cell

任务：

- `PriorityCell`
- `StatusCell`
- `DueDateCell`
- `ScheduledDateCell`
- `ReminderCell`
- `ProjectCell`
- `CreatedAtCell`
- `TagsCell`
- `RestoreActionCell`

验收：

- field cell 不带实体前缀
- field cell 只认功能 props
- 复杂弹层按需渲染

### P5：TaskRowAdapter 接入

目标：

- 用任务列表验证完整链路

任务：

- 新建 `TaskRowAdapter`
- 用 adapter 装配公共 cells
- 替换现 task row 布局

验收：

- 任务页视觉不退化
- 详情打开、优先级、状态、日期、项目行为稳定

### P6：ProjectRowAdapter 接入

目标：

- 验证同一 row 壳对项目实体成立

任务：

- 新建 `ProjectRowAdapter`
- 移除统计信息与双行描述
- 默认在项目详情页隐藏 `ProjectCell`

验收：

- 项目 row 单行
- 不复制 task row 布局
- 无统计信息残留

### P7：LifecycleRowAdapter 接入

目标：

- 验证归档与回收站极简动作方案

任务：

- 新建 `LifecycleRowAdapter`
- 常驻只放 `RestoreActionCell`
- 其他动作移出 row

验收：

- `Archive / Trash` 行界面明显更干净
- row 主界面不堆操作按钮

### P8：清理旧实现

目标：

- 让新旧结构完全收口

任务：

- 删除旧 row surface class
- 删除重复按钮壳
- 删除项目统计 row 相关残留
- 删除旧 board 中的 row 级 API

验收：

- 只有一套 RowShell
- 只有一套 RowMetaButton / RowActionButton
- 只有一套统一 row token

---

## 16. 验收清单

### 16.1 架构验收

- [ ] `Shell` 不感知 `MainCard` 内部细节
- [ ] `MainCard` 不感知 board / row 细节
- [ ] `EntityScene` 只做页面编排
- [ ] `Board / Group` 不承担 row 布局
- [ ] `RowShell` 不 import 业务实体
- [ ] field cells 不带 `task` / `project` 前缀
- [ ] adapter 是唯一实体语义层

### 16.2 交互验收

- [ ] hover 时 checkbox 显示
- [ ] checkbox 显示不导致布局横跳
- [ ] 点击 row 打开详情
- [ ] 点击 status 只打开 status 弹层
- [ ] 点击日期只打开日期弹层
- [ ] 点击项目只打开项目选择器
- [ ] `Archive / Trash` 常驻只留恢复

### 16.3 视觉验收

- [ ] row 高度统一
- [ ] row hover / selected / active 统一
- [ ] 左侧间距统一
- [ ] 右侧按钮高度统一
- [ ] title 正确省略
- [ ] `CreatedAt` 稳定贴最右
- [ ] `Project` 紧邻 `CreatedAt`

### 16.4 性能验收

- [ ] RowShell 无复杂业务计算
- [ ] 复杂弹层按需渲染
- [ ] 大列表无明显卡顿
- [ ] 后续可平滑接入虚拟列表

---

## 17. 开发规则

### 17.1 必须遵守

1. `RowShell` 不允许 import 业务实体。
2. field cell 不允许依赖 task/project/lifecycle 类型语义。
3. field cell 不允许控制整行布局。
4. adapter 不允许复制 row 样式。
5. 行内按钮必须优先复用 `RowMetaButton / RowActionButton`。
6. `CreatedAt` 统一走 `FixedTrailing`。
7. `Settings` 必须纳入 `MainCard + EntityScene`。
8. row token 只有一套。

### 17.2 尽量避免

1. 避免 `UniversalRow`
2. 避免 field cell 内混多个业务字段
3. 避免 adapter 内堆大量条件分支
4. 避免在每个 cell 中直接手写独立按钮样式
5. 避免当前阶段引入 registry

### 17.3 当前阶段允许

1. adapter 显式写 field 顺序
2. adapter 先接收完整实体对象
3. `TagsCell` 先做占位接口
4. 新旧 row 在短期内并行验证

---

## 18. 最终结论

本轮正式采用：

```txt
MainCard + EntityScene + Board + Group + RowShell + Functional Field Cells + Thin Feature Adapters
```

其中最关键的长期约束是：

> 公共字段组件只按功能命名，不按实体命名；实体差异只留在 adapter。

这条规则一旦稳定，StoneFlow 后续无论扩展任务、项目、归档、回收站还是新实体列表，都不需要再发明第二套 row 架构。
