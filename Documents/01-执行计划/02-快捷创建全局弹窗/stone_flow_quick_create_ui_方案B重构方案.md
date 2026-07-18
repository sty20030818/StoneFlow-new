# StoneFlow Quick Create UI 方案 B 重构方案

## 0. 文档定位

这份文档只用于定义 `Quick Create` 快捷创建弹窗的独立 UI 架构方案。

本次不是：

- 把快捷创建并入现有 `Task / Project Create` 链路；
- 把快捷创建改造成全局 `Command` 面板；
- 把已有 create modal 和 helper 窗口强行抽成一套统一平台。

本次是：

- 参考 `Board -> RowShell -> Field Cells -> Adapter` 这套已稳定的分层思路；
- 在 `features/quick-create` 内单独复刻一套适合快捷创建的 UI 架构；
- 全面改用当前仓库的 `shadcn/ui + Tailwind CSS v4` 原生组件体系；
- 为后续真正实现提供稳定的目录、组件、职责与命名契约。

---

## 1. 已确认决策

以下决策已由当前讨论锁定，后续实现默认按此执行：

1. `Quick Create` 是独立 feature，不并入现有 `Task / Project Create` modal 链路。
2. 本轮采用 **方案 B：`Composer + Board` 半复刻架构**。
3. 顶部编辑区不强行伪装成 `Board Row`，它保持 `Composer` 语义。
4. 中部动作与结果区参考 `Board` 分层思维实现，不要求直接复用现有业务链路。
5. `Quick Create` 不以 `Command` 作为主骨架。
6. 所有用户可见控件优先使用仓库现有 `shadcn/ui` 基础组件，不继续扩散裸 `input`、裸 `button`、裸菜单项。
7. 优先级、项目归属、状态、日期、Space 等控制项允许参考现有 task create 的写法，但初期先保留在 `quick-create` 侧独立实现。
8. 共享组件命名继续按功能命名，不把 `task`、`project` 这种实体语义写进未来可能共享的 primitive 名称。
9. `Quick Create` 仍属于高密度效率面板，不退化成普通表单弹窗。

---

## 2. 为什么选方案 B

## 2.1 不选方案 A 的原因

方案 A 是把整个快捷创建从头到尾都 1:1 套进 `Board` 结构。

问题在于：

- 顶部输入区本质是编辑器，不是结果行；
- 如果强行全部 row 化，会让输入态、弹层态、键盘提交态语义变得很别扭；
- `Board` 适合组织结果和动作，不适合承载标题输入本身。

结论：

- `Board` 的价值在于分层思维，不在于必须把整块 UI 都伪装成列表。

## 2.2 不选方案 C 的原因

方案 C 是先把快捷创建、任务创建、项目创建统一抽成一个 create platform。

问题在于：

- 三者容器语义不同：`Quick Create` 是独立工作面板，`Task / Project Create` 是 modal；
- 三者交互密度不同：`Quick Create` 更偏“输入 + 快速决策 + 打开结果”，普通 create 更偏“完整填写 + 确认提交”；
- 现在就上统一平台，容易做出过早抽象和过宽接口。

结论：

- 当前阶段先把 `Quick Create` 自己的 UI 架构写稳，再考虑未来是否抽共享层。

## 2.3 方案 B 的核心判断

方案 B 不是对齐现有 create 链路，而是只复刻其“稳定分层方式”：

- 顶部是 `Composer`
- 中部是 `ActionBoard`
- 底部是 `Footer`

这样能同时满足：

- 输入编辑体验；
- board 化的结构清晰度；
- 后续 row / section / adapter 的可维护性；
- 与现有仓库架构心智的一致性。

---

## 3. 总体架构

最终结构固定为：

```txt
QuickCreatePage
  -> QuickCreateProvider
    -> QuickCreateRoot
      -> QuickCreateSurface
        -> QuickCreateComposer
          -> QuickCreateTitleInput
          -> QuickCreatePrimaryMetaBar
          -> QuickCreateAdvancedMetaBar
        -> QuickCreateActionBoard
          -> QuickCreateCreateSection
          -> QuickCreateRecentTasksSection
          -> QuickCreateRecentProjectsSection
        -> QuickCreateFooter
```

其中 `QuickCreateActionBoard` 再继续下沉为：

```txt
QuickCreateActionBoard
  -> Board.Root
    -> Board.Group
      -> Board.GroupHeader
      -> Board.Rows
        -> QuickCreateCreateRowAdapter
        -> QuickCreateTaskResultRowAdapter
        -> QuickCreateProjectResultRowAdapter
```

说明：

- `Composer` 负责输入与元数据编辑；
- `Board` 负责动作项与结果项的分组组织；
- `Adapter` 负责把 quick-create 的任务/项目/创建预览翻译成统一行面；
- `Footer` 负责状态、反馈、快捷键提示；
- Provider 仍保留为当前状态真相源，但视图层必须拆开，不允许所有 UI 紧耦合在一个大组件里。

---

## 4. 分层职责

### 4.1 Layer 1：QuickCreateSurface

位置建议：

```txt
src/features/quick-create/ui/QuickCreateSurface.tsx
```

职责：

- 面板外层视觉壳；
- 统一圆角、边框、阴影、背景；
- 管理内部纵向分区；
- 不承担业务判断。

禁止：

- 结果渲染逻辑；
- popover 业务状态；
- 列表分组判断；
- 键盘交互分发。

### 4.2 Layer 2：QuickCreateComposer

位置建议：

```txt
src/features/quick-create/ui/QuickCreateComposer.tsx
```

职责：

- 标题输入；
- 一级元数据操作；
- 高级元数据展开收起；
- 与输入行为直接相关的交互。

固定结构建议：

```txt
QuickCreateComposer
├── QuickCreateTitleInput
├── QuickCreatePrimaryMetaBar
└── QuickCreateAdvancedMetaBar
```

说明：

- `Composer` 是编辑面，不是结果列表；
- 它可以有很强的内部布局，但不应该承担 section / row 分组语义。

### 4.3 Layer 3：QuickCreateActionBoard

位置建议：

```txt
src/features/quick-create/ui/QuickCreateActionBoard.tsx
```

职责：

- 承接“创建当前输入”“最近任务”“最近项目”“搜索结果”等动作与结果；
- 复刻 `Board / Group / Rows` 的分层思维；
- 统一 active row、高亮、hover、键盘焦点映射。

固定结构建议：

```txt
QuickCreateActionBoard
├── QuickCreateCreateSection
├── QuickCreateRecentTasksSection
└── QuickCreateRecentProjectsSection
```

说明：

- section 的决定权在 board 层；
- 具体一行长什么样，由 adapter 决定；
- board 不知道任务/项目具体字段细节。

### 4.4 Layer 4：QuickCreate Row Adapters

位置建议：

```txt
src/features/quick-create/ui/adapters/
```

职责：

- 把 `quick-create` 自己的数据结构翻译为统一 row surface；
- 控制点击、hover、active、键盘打开等行语义；
- 决定当前行用了哪些功能型 cell。

建议至少拆出：

```txt
QuickCreateCreateRowAdapter
QuickCreateTaskResultRowAdapter
QuickCreateProjectResultRowAdapter
```

禁止：

- 在 adapter 内硬编码 section 分组；
- 在 adapter 内直接决定 footer 文案；
- 在 adapter 内处理 provider 级网络流程。

### 4.5 Layer 5：QuickCreate Footer

位置建议：

```txt
src/features/quick-create/ui/QuickCreateFooter.tsx
```

职责：

- 展示提交状态；
- 展示错误/成功消息；
- 展示快捷键提示；
- 不直接参与 row / composer 布局。

---

## 5. 组件结构建议

推荐目录结构：

```txt
src/features/quick-create/
├── model/
├── api/
└── ui/
    ├── QuickCreatePage.tsx
    ├── QuickCreateRoot.tsx
    ├── QuickCreateSurface.tsx
    ├── QuickCreateComposer.tsx
    ├── QuickCreateTitleInput.tsx
    ├── QuickCreatePrimaryMetaBar.tsx
    ├── QuickCreateAdvancedMetaBar.tsx
    ├── QuickCreateActionBoard.tsx
    ├── QuickCreateFooter.tsx
    ├── adapters/
    │   ├── QuickCreateCreateRowAdapter.tsx
    │   ├── QuickCreateTaskResultRowAdapter.tsx
    │   └── QuickCreateProjectResultRowAdapter.tsx
    └── controls/
        ├── PriorityControl.tsx
        ├── StatusControl.tsx
        ├── PlacementControl.tsx
        ├── SpaceControl.tsx
        └── DateControl.tsx
```

说明：

- `controls/` 是快捷创建内部的功能控件层；
- `adapters/` 是结果区行装配层；
- `ui/` 根层只保留页面骨架组件；
- 后续若某些 `controls` 证明具备稳定跨场景价值，再考虑上提到 `shared`。

---

## 6. 视觉与组件策略

## 6.1 组件策略

后续实现必须遵循：

1. 优先使用现有 `shadcn/ui` 基础组件：
   - `Input`
   - `Button`
   - `Popover`
   - `DropdownMenu`
   - `Calendar`
   - `Board`
   - `RowShell`
2. 不再继续写裸 `input` 作为正式输入壳。
3. 不再继续写裸 `button` 作为正式结果行壳。
4. 状态菜单、优先级菜单、项目菜单优先回到 `DropdownMenu / Popover` 组合，而不是 quick-create 私有 DOM。

## 6.2 视觉方向

`Quick Create` 的视觉目标不是“普通创建弹窗”，而是：

- 高密度；
- 原生；
- 利落；
- 偏工作台；
- 输入优先；
- 结果次级但可快速浏览。

具体要求：

1. 顶部 `Composer` 是最高视觉优先级。
2. 中部 `ActionBoard` 需要有明显的 section 层级，但不能做成重型表格。
3. 底部 `Footer` 只做状态与提示，不抢主视觉。
4. 动作按钮、meta control、row active 态应尽量统一几何语言。
5. 面板整体避免出现第二层多余 `Card` 包裹。

---

## 7. 状态与组合规则

## 7.1 Provider 边界

`QuickCreateProvider` 继续作为状态真相源，负责：

- draft；
- 搜索结果；
- submit state；
- focus target；
- popover state；
- 快捷键动作。

但 Provider 不应继续让所有 UI 直接紧贴一个大对象读写。

推荐模式：

- `Root` 只拿大分区所需状态；
- `Composer` 只关心输入与 meta；
- `ActionBoard` 只关心结果、创建项、active index；
- `Footer` 只关心 message / submitState / shortcut 文案。

目的：

- 降低整个弹窗因局部输入变化而整体重渲染的压力；
- 避免一个组件同时知道输入、结果、footer、提交、popover 全部细节。

## 7.2 组合规则

后续组件设计遵循：

1. 不使用“大组件 + 一堆布尔 prop”模式。
2. 优先拆成显式子组件，而不是 `compact / advanced / inline / rowLike` 这类模式 prop。
3. board 的 section 是显式组件，不用一个巨型组件通过 `variant` 控制三种完全不同布局。
4. row 的任务/项目/创建预览差异放在 adapter，不放在 shared row primitive。

---

## 8. 可复用边界

## 8.1 当前允许参考但不直接对齐的内容

可以参考：

- `TaskCreateMetaActions` 的菜单结构；
- `PriorityIcon`；
- `TaskStatusIndicator`；
- `Board / RowShell` 的职责切分；
- 现有 create modal 的 token 和交互密度。

但当前不要求：

- 直接复用 `TaskCreateMetaActions` 作为 quick-create 真相源；
- 直接复用 `TaskCreateContent` 或 `ProjectCreateContent` 的组件组合；
- 为了复用而把 quick-create 改造成普通 modal 表单。

## 8.2 当前先留在 feature 内部的内容

以下内容第一阶段建议保留在 `features/quick-create`：

- `PriorityControl`
- `StatusControl`
- `PlacementControl`
- `SpaceControl`
- `DateControl`
- `QuickCreate*RowAdapter`

原因：

- 它们还带有明显的 quick-create 交互语义；
- 现在就上提 shared，容易做出过宽接口；
- 等两边都稳定后，再按功能命名抽 shared primitive，风险更低。

---

## 9. 为什么不用 Command 作为主骨架

这条需要显式写清楚，避免后续回摆。

`Command` 适合：

- 全局搜索；
- 页面跳转；
- action palette；
- 轻量结果选择。

`Quick Create` 当前包含：

- 标题输入；
- 多个元数据编辑入口；
- 高级参数折叠区；
- 创建预览；
- 最近任务 / 最近项目结果；
- 连续创建；
- 创建并打开。

这不是一个纯 `Command` 问题，而是一个“编辑器 + 动作板 + 结果板”的组合界面。

如果强行以 `Command` 为主骨架，会出现：

1. 输入框职责冲突：
   - 标题输入和 command query 不是一回事。
2. 结果区职责冲突：
   - 有些行是“创建动作”，有些行是“打开结果”，语义不同。
3. 弹层职责冲突：
   - meta control 的 popover 会和 command active/focus 逻辑互相干扰。
4. 架构边界变差：
   - 容易让输入、结果、状态提示都挂到一个命令列表语义下。

结论：

- 可以借鉴 `Command` 的键盘导航体验；
- 但不能让 `Command` 成为 `Quick Create` 的正式主结构。

---

## 10. 分阶段落地建议

### 阶段 1：先完成分层，不追求全量复用

目标：

- 拆出 `Surface / Composer / ActionBoard / Footer`
- 去掉现有 view 层里最明显的私有大组件堆叠
- 保证结构清晰

### 阶段 2：结果区 board 化

目标：

- `CreateRow`
- `RecentTaskRow`
- `RecentProjectRow`

全部进入 `Board + Adapter` 体系。

### 阶段 3：控件原子收口

目标：

- `PriorityControl`
- `StatusControl`
- `PlacementControl`
- `SpaceControl`
- `DateControl`

从当前 quick-create 私有 DOM 迁移到更稳定的 shadcn 组合方式。

### 阶段 4：再评估共享抽象

目标：

- 只在两边都稳定后，再判断哪些控件值得上提 shared；
- 不在第一轮就引入 create platform。

---

## 11. 非目标

本轮文档明确不包含以下目标：

1. 不定义快捷创建的后端接口重写方案。
2. 不定义 helper 窗口层级或 Tauri 窗口行为修改。
3. 不把 `Quick Create` 和普通 create modal 统一成同一个产品入口。
4. 不在本轮就抽出 create 平台层。
5. 不要求第一轮把所有交互都做成共享组件。

---

## 12. 最终结论

`Quick Create` 的正式方向固定为：

- **独立 feature**
- **方案 B：`Composer + Board`**
- **参考 board 架构思维，但不直接对齐现有 create 链路**
- **顶层输入区保持编辑器语义**
- **中部动作与结果区复刻 `Board + RowAdapter` 分层**
- **优先使用现有 shadcn/ui 原生组件**
- **可复用能力先放在设计约束里，不在第一轮强抽 shared**

后续实现若与本文冲突：

- 优先保留 `Quick Create` 的独立语义；
- 优先保留分层清晰；
- 优先保留最小可维护方案；
- 不为了表面复用破坏这套架构。
