# StoneFlow 字段控件统一重构开发方案

> 版本：v1
> 目标：统一主应用内 `outline button + DropdownMenu` 形态的实体字段控件
> 范围：Task row、Task drawer、Task create dialog、Project row、Space selector
> 不包含：Quick Create、右键菜单、Command Menu、View editor、普通动作菜单

---

## 1. 背景

当前项目里状态、优先级、日期、项目归属、Space 等字段控件已经形成明显重复：

- Task row 里有 `StatusCell`、`PriorityCell`、`ProjectCell`、`DueDateCell` 等 row cell。
- Task drawer 里又手写了一套 `DropdownMenu + DetailMetaButton + menu item + checked indicator`。
- Task create dialog 里还有 `StatusMetaAction`、`PriorityMetaAction`、`ProjectMetaAction`。
- Project row 和 Space 选择也有相似的 outline button + dropdown 结构。

这些控件在视觉、交互和菜单结构上应统一，不再按页面散落实现。

本方案只处理常规字段控件，不处理 Quick Create、右键菜单、Command Menu 和 View editor。它们的交互形态不同，后续需要时单独规划。

---

## 2. 目标

### 2.1 统一内容

本次统一以下字段类型：

| 字段 | 当前使用场景 | 目标控件 |
|---|---|---|
| 状态 | Task row、Task drawer、Task create dialog | `MetadataFieldDropdown` |
| 优先级 | Task row、Task drawer、Task create dialog | `MetadataFieldDropdown` |
| 项目 / 归属 | Task row、Task drawer、Task create dialog、Project row | `MetadataPlacementDropdown` |
| 日期 | Task row、Task drawer、Project row | `MetadataDateDropdown` / `MetadataDateButton` |
| Space | Create dialog shell / Space selector | `MetadataFieldDropdown` |

### 2.2 统一标准

- 按钮统一使用 `Button variant="outline" size="sm"`。
- Dropdown 统一使用 `DropdownMenuContent align="start" sideOffset={6}`。
- Menu item 统一使用 `gap-2 p-2`。
- 选中态统一为 checked / mixed / none。
- 数字快捷键统一接入 `ShortcutDigitSelectLayer`。
- 日期先只做 preset dropdown，自定义日期先 disabled，后续再接 Calendar。
- row、drawer、create dialog 只负责传入当前值和保存回调，不再手写 Dropdown 结构。

---

## 3. 非目标

本次明确不做：

1. 不改 Quick Create 的 `StatusControl`、`PriorityControl`、`DateControl`、`PlacementControl`、`SpaceControl`。
2. 不改 `TaskContextMenu` 右键菜单。
3. 不改 Command Menu scoped picker。
4. 不改 View editor 里的筛选表单和 `Select`。
5. 不改 `ViewActionsMenu` 这类普通动作菜单。
6. 不把 autosave、store mutation、API 调用写进通用字段控件。
7. 不为未来能力提前做配置化 / 插件化系统。

---

## 4. 模块位置

新增模块：

```txt
src/features/metadata-fields/
├── core/
│   ├── metadata-field.types.ts
│   ├── metadata-selection.ts
│   ├── metadata-date-options.ts
│   └── metadata-placement.ts
├── ui/
│   ├── MetadataFieldButton.tsx
│   ├── MetadataFieldDropdown.tsx
│   ├── MetadataFieldMenuItem.tsx
│   ├── MetadataDateDropdown.tsx
│   ├── MetadataDateButton.tsx
│   └── MetadataPlacementDropdown.tsx
├── adapters/
│   ├── taskMetadataFields.tsx
│   ├── projectMetadataFields.tsx
│   └── spaceMetadataFields.tsx
└── index.ts
```

选择 `features/metadata-fields` 的原因：

- 它不是纯 UI primitive，不应放进 `shared/ui`。
- 它也不只服务 Task，不应命名成 `task-metadata-controls`。
- 它是跨实体的业务字段控件 feature，负责把实体字段映射为统一 UI 契约。

---

## 5. 组件契约

### 5.1 `MetadataFieldButton`

统一字段触发器。

```tsx
type MetadataFieldButtonProps = {
  icon?: React.ReactNode
  label: React.ReactNode
  disabled?: boolean
  className?: string
  ariaLabel?: string
  stopPropagation?: boolean
}
```

规则：

- 默认 `variant="outline"`。
- 默认 `size="sm"`。
- 默认渲染 icon + truncate label。
- `stopPropagation` 默认 `false`，row 内使用时显式传入 `true`。
- 不再为状态 / 优先级保留 row 专用 `size-5 icon-only` 触发器。

### 5.2 `MetadataFieldMenuItem`

统一菜单项。

```tsx
type MetadataFieldMenuItemProps<TValue> = {
  value: TValue
  label: React.ReactNode
  icon?: React.ReactNode
  trailing?: React.ReactNode
  digit?: string
  indicator?: 'checked' | 'mixed' | null
  disabled?: boolean
  onSelect: (value: TValue) => void
}
```

规则：

- item class 固定为 `gap-2 p-2`。
- 左侧为 icon。
- 中间 label 必须 `truncate`。
- 右侧顺序固定：indicator、数字快捷键、trailing。
- checked / mixed 的视觉在这里统一，不允许各页面再各写一套。

### 5.3 `MetadataFieldDropdown`

普通单选字段下拉。

```tsx
type MetadataFieldOption<TValue> = {
  value: TValue
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  isEmptyValue?: boolean
}

type MetadataFieldDropdownProps<TValue> = {
  label: string
  value: TValue
  values?: TValue[]
  options: MetadataFieldOption<TValue>[]
  buttonLabel?: React.ReactNode
  buttonIcon?: React.ReactNode
  disabled?: boolean
  drawerOwnedOverlay?: boolean
  stopPropagation?: boolean
  onChange: (value: TValue) => void
}
```

规则：

- `value` 用于单选当前值。
- `values` 用于批量场景 mixed indicator；本阶段可先实现但不接批量 UI。
- `isEmptyValue` 控制数字快捷键是否从 `0` 开始。
- `drawerOwnedOverlay` 为 `true` 时，`DropdownMenuContent` 加 `data-drawer-owned-overlay="true"`。

### 5.4 `MetadataDateDropdown`

日期 preset 下拉。

```tsx
type MetadataDateDropdownProps = {
  label: string
  value: string | null | undefined
  icon: React.ReactNode
  disabled?: boolean
  drawerOwnedOverlay?: boolean
  stopPropagation?: boolean
  onChange: (value: string | null) => void
}
```

选项固定：

| key | label | value | 状态 |
|---|---|---|---|
| none | 未设置 | `null` | enabled |
| today | 今天 | 本地今天 | enabled |
| tomorrow | 明天 | 本地明天 | enabled |
| this-week | 本周 | 本地本周结束日 | enabled |
| one-week | 一周后 | 本地 7 天后 | enabled |
| custom | 自定义日期 | `null` | disabled |

`custom` 先 disabled，显示 `后续接入`。后续接 Calendar 时，只改 `MetadataDateDropdown`，不改调用方。

### 5.5 `MetadataDateButton`

日期只读 / 可点击按钮。用于 row 里只展示日期的第一阶段迁移。

```tsx
type MetadataDateButtonProps = {
  labelPrefix: string
  value: string | null | undefined
  icon: React.ReactNode
  formatter?: (value: string) => string
  disabled?: boolean
  stopPropagation?: boolean
}
```

如果后续确认 row 上日期也要可编辑，可直接替换为 `MetadataDateDropdown`。

### 5.6 `MetadataPlacementDropdown`

项目 / 归属类字段下拉。

```tsx
type MetadataPlacementValue =
  | { kind: 'inbox' }
  | { kind: 'noProject' }
  | { kind: 'project'; projectId: string }
  | { kind: 'space'; spaceId: string }

type MetadataPlacementOption = {
  value: MetadataPlacementValue
  label: string
  icon?: React.ReactNode
  disabled?: boolean
  isEmptyValue?: boolean
}
```

规则：

- Task create dialog 可使用 `inbox / noProject / project`。
- Task row / drawer 可使用 `noProject / project`。
- Project row 后续若需要父项目，可使用 `noProject / project`。
- Space selector 可继续使用 `MetadataFieldDropdown`，不强行塞进 placement。

---

## 6. Adapter 职责

### 6.1 `taskMetadataFields.tsx`

负责：

- 从 `TASK_STATUS_OPTIONS` 生成 status options。
- 从 `TASK_PRIORITY_OPTIONS` 生成 priority options。
- 使用 `TaskStatusIndicator` 和 `PriorityIcon`。
- 提供 task placement option builder。
- 提供 task 字段 label formatter。

禁止：

- 不读取 task store。
- 不执行 autosave。
- 不调用 task API。

### 6.2 `projectMetadataFields.tsx`

负责：

- Project row 的 due date field 配置。
- Project parent / 归属项目 option builder。
- 后续如果 Project 增加 status / priority，统一放这里。

### 6.3 `spaceMetadataFields.tsx`

负责：

- 从 `Space[]` 和 `getSpaceVisual` 生成 space dropdown options。
- 提供当前 Space label 和 icon。

---

## 7. 替换清单

### 7.1 Task row

文件：

```txt
src/features/task/ui/TaskRowAdapter.tsx
```

替换：

- `PriorityCell` -> `MetadataFieldDropdown` + task priority adapter。
- `StatusCell` -> `MetadataFieldDropdown` + task status adapter。
- `ProjectCell` -> `MetadataPlacementDropdown`。
- `DueDateCell` -> `MetadataDateButton`，后续可改 `MetadataDateDropdown`。
- `ScheduledDateCell` -> `MetadataDateButton`。
- `ReminderCell` -> `MetadataDateButton`。

注意：

- row 内必须 `stopPropagation=true`。
- 字段点击不能触发行打开。
- 原有 pending / disabled 行为保持不变。

### 7.2 Task drawer

文件：

```txt
src/features/task/detail/ui/TaskPropertiesSection.tsx
src/features/task/detail/ui/TaskProjectSection.tsx
```

替换：

- 状态 dropdown -> `MetadataFieldDropdown`。
- 优先级 dropdown -> `MetadataFieldDropdown`。
- 截止 / 计划 / 提醒 -> `MetadataDateDropdown`。
- 项目 -> `MetadataPlacementDropdown`。

注意：

- drawer 内必须 `drawerOwnedOverlay=true`。
- `autosave.setField` / `autosave.setDraft` 仍留在 drawer 层。
- `applyTaskProjectDraftChange` 仍留在 task detail model 或调用层，不进入通用 UI。

### 7.3 Task create dialog

文件：

```txt
src/features/task/ui/TaskCreateMetaActions.tsx
```

替换：

- `StatusMetaAction` -> `MetadataFieldDropdown`。
- `PriorityMetaAction` -> `MetadataFieldDropdown`。
- `ProjectMetaAction` -> `MetadataPlacementDropdown`。

注意：

- 保留 create dialog 的状态来源和提交逻辑。
- 只替换字段 UI。

### 7.4 Project row

文件：

```txt
src/features/project/ui/ProjectRowAdapter.tsx
```

替换：

- `ProjectCell` -> `MetadataPlacementDropdown` 或 project adapter 下的 parent project dropdown。
- `DueDateCell` -> `MetadataDateButton`。

注意：

- Project row 中的完成、归档、删除按钮不是字段控件，本轮不改。

### 7.5 Space selector

文件：

```txt
src/features/space/ui/SpaceDropdownMenu.tsx
src/shared/ui/create-dialog-shell.tsx
```

替换：

- `SpaceDropdownMenu` 内部改用 `MetadataFieldDropdown`。
- 外部调用 API 可先保持不变，降低迁移成本。

注意：

- `SpaceDropdownMenu` 可先作为兼容 wrapper 保留。
- 后续调用点稳定后，再考虑直接使用 metadata-fields API。

---

## 8. Legacy 处理

以下旧 row cells 第一阶段不要直接删除：

```txt
src/shared/ui/row/cells/StatusCell.tsx
src/shared/ui/row/cells/PriorityCell.tsx
src/shared/ui/row/cells/ProjectCell.tsx
src/shared/ui/row/cells/DueDateCell.tsx
src/shared/ui/row/cells/ScheduledDateCell.tsx
src/shared/ui/row/cells/ReminderCell.tsx
```

推荐策略：

1. 新增 metadata-fields。
2. 先让旧 cells 内部调用新组件，或逐步把调用点迁到新组件。
3. 确认没有旧导入后，再删除旧 cells。

不要在同一阶段同时新增模块、迁移所有调用点、删除旧文件。这样风险太高，测试失败时难定位。

---

## 9. 分阶段实施

### 阶段 1：新增模块与基础测试

新增：

- `MetadataFieldButton`
- `MetadataFieldMenuItem`
- `MetadataFieldDropdown`
- `MetadataDateDropdown`
- `MetadataDateButton`
- `MetadataPlacementDropdown`
- task / project / space adapters

测试覆盖：

- checked indicator。
- mixed indicator。
- empty value 数字从 `0` 开始。
- 普通 option 数字从 `1` 开始。
- disabled custom date。
- drawer overlay 属性。
- row stop propagation。

### 阶段 2：迁移 Task drawer

先迁移：

- `TaskPropertiesSection`
- `TaskProjectSection`

原因：

- 重复最多。
- 不涉及 row click 阻断。
- 可快速验证 autosave 行为是否保持。

### 阶段 3：迁移 Task row / Project row

迁移：

- `TaskRowAdapter`
- `ProjectRowAdapter`

重点验证：

- 点击字段按钮不打开 row。
- Dropdown 数字快捷键仍可用。
- row hover / selected 样式不漂移。

### 阶段 4：迁移 Task create dialog / Space selector

迁移：

- `TaskCreateMetaActions`
- `SpaceDropdownMenu`

目标：

- 创建类弹窗和主列表 / drawer 使用同一套字段控件。

### 阶段 5：清理旧 row cells

前提：

- 所有直接导入旧 field cells 的业务代码已经迁移。
- 测试通过。

处理：

- 删除旧 cells，或保留一阶段兼容 re-export。
- 更新 `src/shared/ui/row/index.ts`。

---

## 10. 验证命令

最小验证：

```bash
bun run test:run src/features/metadata-fields
bun run test:run src/features/task/detail src/features/task/ui src/features/project/ui src/features/space/ui src/shared/ui/row
bun run typecheck
```

格式验证：

```bash
bunx oxfmt --check src/features/metadata-fields src/features/task src/features/project src/features/space src/shared/ui/row
```

如果改动涉及 Rust / Tauri，不属于本方案范围；本方案正常不需要跑 cargo。

---

## 11. 完成标准

完成后应满足：

1. 常规字段下拉不再在 row、drawer、create dialog 中重复手写。
2. 状态、优先级、项目归属、日期、Space 使用统一按钮和菜单结构。
3. 日期自定义入口可见但 disabled，后续能集中接 Calendar。
4. row 内字段点击不触发行打开。
5. drawer 内 dropdown overlay 仍被 drawer 正确识别。
6. Quick Create、右键菜单、Command Menu、View editor 没有被本轮误改。
7. 新增字段控件时，优先通过 `metadata-fields` adapter 扩展，而不是在业务页面再手写 Dropdown。

---

## 12. 风险与注意事项

### 12.1 Row 视觉变化

当前 row 的状态 / 优先级是 `size-5 icon-only`，统一后会变为 outline button。这个是有意变化，用于消除字段控件视觉分裂。

如果实际 UI 过宽，可以在 `MetadataFieldButton` 增加统一的 `compact` 尺寸，但不要回到每个 row 自己写 class。

### 12.2 日期字段行为变化

当前 row 日期只展示不编辑；drawer 日期可编辑。第一阶段建议 row 仍使用 `MetadataDateButton` 只读，避免一次性改变 row 编辑行为。

后续如果要 row 直接改日期，再把 row 的 `MetadataDateButton` 替换成 `MetadataDateDropdown`。

### 12.3 Placement value 转换

不同模块对归属的命名不同：

- task create: `TaskPlacement`
- task detail: `projectId`
- row: `projectId / projectName`
- metadata-fields: `MetadataPlacementValue`

转换必须留在 adapter 或调用层，不要让 UI 组件知道具体实体 store。

### 12.4 Shared 层依赖

`src/shared/ui/row/cells/*` 目前依赖 task 业务选项的风险已经存在。重构后应逐步把业务字段控件移出 `shared/ui/row`，让 `shared/ui/row` 只保留 RowShell、布局槽和纯展示 primitive。
