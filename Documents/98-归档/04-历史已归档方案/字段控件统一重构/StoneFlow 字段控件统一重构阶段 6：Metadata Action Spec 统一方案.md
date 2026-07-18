# StoneFlow 字段控件统一重构阶段 6：Metadata Action Spec 统一方案

> 版本：v1
> 目标：统一 dropdown / 右键菜单 / command scoped picker 的字段语义与选项数据
> 范围：`status`、`priority`、`dueDate`、`project / placement`、`space`
> 不包含：万能菜单组件、filter picker 统一、快捷键系统改造、业务提交逻辑改写

---

## 1. Summary

阶段 6 不再继续做“页面级别逐个对齐”，而是把字段控件的**语义层**抽出来，收口成一套共享的 `Metadata Action Spec`。

本阶段要统一的是：

- 字段 identity
- header 文案
- header shortcut
- command placeholder
- 选项顺序
- 选项 label
- icon 语义
- digit hint 规则
- disabled / disabledReason

本阶段不统一的是：

- dropdown / context menu / command picker 的交互壳
- 搜索逻辑
- placement / space 的业务值转换
- filter picker 的筛选语义

结论很明确：

**统一 option schema 和语义工厂，保留三套 presenter。**

不要做一个 `variant="dropdown|context|command"` 的万能组件。

---

## 2. 背景

当前仓库已经完成了字段控件的大部分视觉统一，但仍然存在一类结构性重复：

1. `MetadataFieldDropdown` 已经有 `fieldKey`，但 header、placeholder、options 仍然有不少地方是各写各的。
2. `TaskContextMenu` 的日期 submenu 已经开始复用共享日期 options，但 status / priority / placement 还没有形成统一 spec。
3. `CommandMenu` 的 scoped picker 已经开始对齐真实字段语义，但它仍然保留自己的 option 组装逻辑和文案入口。

这说明当前代码已经证明了方向是对的，但共享层只共享到了“部分 options factory”，还没上升到“统一字段动作语义”。

如果继续按页面一点点补：

- 文案容易再次漂移；
- icon 语义容易再分叉；
- digit / shortcut 规则会继续在三处散落；
- 后面新增字段时仍要三处各写一遍。

所以阶段 6 的目标不是再补一个 UI，而是补一层更稳定的 shared semantic contract。

---

## 3. 目标

### 3.1 统一内容

本阶段希望统一以下字段动作语义：

| 字段 | dropdown | 右键菜单 | command scoped picker |
|---|---|---|---|
| 状态 | 是 | 是 | 是 |
| 优先级 | 是 | 是 | 是 |
| 截止时间 | 是 | 是 | 是 |
| 计划时间 | 是 | 否 | 否 |
| 提醒时间 | 是 | 否 | 否 |
| 项目 / 归属 | 是 | 是 | 是 |
| Space | 是 | 否 | 部分保留未来空间 |

### 3.2 统一标准

- 字段 header 文案只维护一份。
- 字段 header shortcut 只维护一份。
- command placeholder 只维护一份。
- 选项顺序、label、icon 语义只维护一份。
- `digit` / `isEmptyValue` 规则只维护一份。
- disabled 原因只维护一份。
- 三处 UI 只做 presenter mapping，不再自己决定字段语义。

---

## 4. 非目标

本阶段明确不做：

1. 不做 `UniversalMetadataMenu`。
2. 不把 dropdown / context menu / command 合并成一个组件。
3. 不统一 filter picker。
4. 不重写 command 搜索或 query 流程。
5. 不把 `TaskPlacement`、`projectId`、`spaceId` 的业务转换塞进 shared core。
6. 不处理 Quick Create、View editor、普通 action menu。
7. 不改现有快捷键系统分发架构。

---

## 5. 设计原则

### 5.1 统一语义，不统一交互壳

三套 UI 的视觉结构相似，但交互模型不同：

- dropdown 有 trigger button 和 menu
- 右键菜单有 submenu 和层级结构
- command 有 placeholder、query、digit 接管、搜索结果态

它们不应该被合并成同一个组件。

正确做法是：

- **共享字段语义**
- **共享选项数据**
- **共享 icon token**
- **保留三套 presenter**

### 5.2 core 不直接依赖 JSX

`Metadata Action Spec` 应该尽量保持“纯数据 + 轻语义”，不要直接在 core 里塞 `ReactNode`。

否则 shared core 会继续绑死在某一套 UI 上，后面还是没法真正复用。

### 5.3 业务转换留在业务 adapter

下面这些仍然应该留在 feature 自己的 adapter 里：

- `TaskPlacement / projectId` 与共享 value 的双向转换
- `selectedSpaceId === null` 显示“全部 Spaces”
- `独立事项 / 收件箱 / 项目` 的业务映射
- 命令菜单上下文里当前 selection 的 mixed 判断

shared core 只负责定义字段动作，不负责推导页面业务状态。

---

## 6. 推荐架构

### 6.1 核心思路

新增一层 `Metadata Action Spec`：

- 输入：字段类型和必要上下文
- 输出：统一字段动作 spec

然后三套 presenter 各自消费：

- dropdown presenter
- context menu presenter
- command picker presenter

### 6.2 数据流

```txt
metadata action factories
        ↓
 MetadataActionSpec<T>
        ↓
 ┌──────────────┬──────────────────┬──────────────────┐
 │ dropdown map │ context menu map │ command menu map │
 └──────────────┴──────────────────┴──────────────────┘
        ↓                ↓                    ↓
 MetadataFieldDropdown   TaskContextMenu      CommandMenu
```

### 6.3 目录建议

```txt
src/features/metadata-fields/
├── core/
│   ├── metadata-action-spec.ts
│   ├── metadata-action-factories.ts
│   ├── metadata-icon-tokens.ts
│   └── metadata-field.types.ts
├── ui/
│   └── ...
```

新增两层映射 adapter：

```txt
src/features/task/ui/
├── task-context-menu-metadata.tsx

src/features/command/ui/
├── command-menu-metadata.tsx
```

说明：

- `metadata-fields/core` 负责定义统一字段动作语义。
- `task/command` 各自负责把 spec 转成自己需要的 item 结构。
- 不要把 command/context menu presenter 反向塞进 `metadata-fields`。

---

## 7. 类型设计

### 7.1 `MetadataActionFieldKey`

```ts
type MetadataActionFieldKey =
  | 'status'
  | 'priority'
  | 'project'
  | 'space'
  | 'dueDate'
  | 'scheduledDate'
  | 'reminderDate'
```

### 7.2 `MetadataActionIconKey`

```ts
type MetadataActionIconKey =
  | 'status-todo'
  | 'status-doing'
  | 'status-done'
  | 'priority-0'
  | 'priority-1'
  | 'priority-2'
  | 'priority-3'
  | 'calendar-off'
  | 'calendar-1'
  | 'calendar'
  | 'calendar-days'
  | 'calendar-cog'
  | 'calendar-clock'
  | 'calendar-x-2'
  | 'folder'
  | 'target'
  | 'space'
```

### 7.3 `MetadataActionOption`

```ts
type MetadataActionOption<TValue> = {
  key: string
  value: TValue
  label: string
  iconKey?: MetadataActionIconKey
  meta?: string
  disabled?: boolean
  disabledReason?: string
  digit?: string
  isEmptyValue?: boolean
  groupKey?: string
  groupLabel?: string
}
```

### 7.4 `MetadataActionSpec`

```ts
type MetadataActionSpec<TValue> = {
  fieldKey: MetadataActionFieldKey
  headerLabel: string
  headerShortcut?: string
  commandPlaceholder?: string
  options: MetadataActionOption<TValue>[]
}
```

### 7.5 设计约束

- `iconKey` 是 token，不是 `ReactNode`
- `disabledReason` 是语义文本，不是视图 JSX
- `groupKey/groupLabel` 只描述分组，不描述具体渲染结构
- `fieldKey` 是 header / shortcut / placeholder 的根语义，不再靠 `label` 猜

---

## 8. 工厂设计

建议先做这些 factory：

### 8.1 稳定基础字段

- `createStatusActionSpec()`
- `createPriorityActionSpec()`
- `createDueDateActionSpec({ currentValue, showClearOption })`

### 8.2 日期扩展字段

- `createScheduledDateActionSpec({ currentValue, showClearOption })`
- `createReminderDateActionSpec({ currentValue, showClearOption })`

### 8.3 placement / space

- `createPlacementActionSpec({ projects, spaces, includeInbox, currentSpaceId })`
- `createSpaceActionSpec({ spaces, selectedSpaceId })`

### 8.4 规则

- factory 只产出 spec，不产出具体菜单组件
- factory 内部允许复用已有 `metadata-date-options`、`taskMetadataFields` 等现有逻辑
- command/context menu 不再自己定义“这一组字段叫什么”

---

## 9. 三套 Presenter 的职责

### 9.1 Dropdown Presenter

继续由：

- `MetadataFieldDropdown`
- `MetadataDateDropdown`
- `MetadataPlacementDropdown`

负责。

职责：

- 渲染按钮
- 渲染 menu header
- 渲染 checked / mixed / kbd / trailing
- 接 `ShortcutDigitSelectLayer`

它不再负责：

- 自己推导 header 文案
- 自己决定 shortcut
- 自己拼日期 options

### 9.2 Context Menu Presenter

建议新增：

- `task-context-menu-metadata.tsx`

职责：

- 把 `MetadataActionSpec` 转成右键菜单 item / submenu
- 映射 `iconKey -> ReactNode`
- 把选项选择回调接到现有 `TaskContextMenu` 行为

它不负责：

- 重新定义字段文案
- 自己复制一份日期 option 规则

### 9.3 Command Menu Presenter

建议新增：

- `command-menu-metadata.tsx`

职责：

- 把 `MetadataActionSpec` 转成 command row model
- 接 placeholder
- 接 digit hint
- 接 `ShortcutDigitSelectLayer`
- 做 `iconKey -> ReactNode`

它不负责：

- 自己单独维护字段动作 copy
- 再造一份 status / priority / dueDate options

---

## 10. 分阶段实施

### 阶段 6A：抽出 core spec，先收最稳的 3 类字段

范围：

- `status`
- `priority`
- `dueDate`

目标：

- 抽出 `MetadataActionSpec`
- 抽出 `createStatusActionSpec()`
- 抽出 `createPriorityActionSpec()`
- 抽出 `createDueDateActionSpec()`

实现要求：

- 先不改 placement / space
- dropdown / context menu / command 三处全部改从 spec 取 header、shortcut、options
- 不改变已有业务行为

为什么先做这 3 类：

- 重复最明显
- 当前视觉和语义已经最稳定
- command / context menu / dropdown 三处都已存在真实用例

### 阶段 6B：补 presenter mapping

范围：

- dropdown mapping
- context menu mapping
- command menu mapping

目标：

- 三处都不再直接依赖字段私有 option 拼装
- 三处都通过同一份 spec 渲染

实现要求：

- mapping 层只做展示结构适配
- 不要把业务条件判断塞回 mapping 层

### 阶段 6C：迁 placement / project

范围：

- `project`
- `no project`
- `inbox`

目标：

- 把 placement 的 header / option schema / group schema 收口到 spec

实现要求：

- `TaskPlacement/projectId` 的转换仍留在 task 自己的 adapter
- `独立事项 / 收件箱 / 项目` 的业务判断不进 shared core
- group header 规则可共享，但 group item 的命令行为仍由 presenter 承接

### 阶段 6D：迁 space

范围：

- `SpaceDropdownMenu` 已收口后的 create dialog shell 选择器
- 未来其他 space picker 预留统一入口

目标：

- 统一 space header / button visual / options schema

实现要求：

- `selectedSpaceId === null` 继续只作为“全部 Spaces”的展示态
- 本阶段不把“全部 Spaces”变成真正选项

---

## 11. 不建议的做法

### 11.1 不要做万能组件

下面这种方向不建议：

```tsx
<UniversalMetadataMenu variant="dropdown" />
<UniversalMetadataMenu variant="context-menu" />
<UniversalMetadataMenu variant="command" />
```

原因：

- 三套交互差异太大
- 逻辑分支会急速膨胀
- 最后会变成一个难维护的大组件

### 11.2 不要在 core 放 JSX

如果 core 直接输出：

- `icon: <CalendarIcon />`
- `trailing: <Kbd>D</Kbd>`

那它就不是 semantic core，而是半个 UI 组件。

这会让：

- 测试耦合更高
- command / context menu 更难定制
- shared core 更难复用

### 11.3 不要提前统一 filter picker

filter picker 虽然表面像字段菜单，但语义不同：

- metadata action 是“设置字段”
- filter picker 是“筛选视图”

这两者不该在本阶段混在一起。

---

## 12. 测试计划

### 12.1 阶段 6A / 6B

- `bun run test:run src/features/metadata-fields/metadata-fields.test.tsx`
- `bun run test:run src/features/task/ui/TaskRowAdapter.test.tsx`
- `bun run test:run src/features/task/detail/ui/TaskPropertiesSection.test.tsx`
- `bun run test:run src/features/task/ui/TaskCreateContent.test.tsx`
- `bun run test:run src/features/command/ui/CommandMenu.test.tsx`
- `bun run typecheck`
- `git diff --check`

### 12.2 阶段 6C / 6D

在上面基础上补：

- `bun run test:run src/shared/ui/create-dialog-shell.test.tsx`
- placement / space 对应新增测试文件

### 12.3 验收标准

- header 文案在三处只维护一份
- dueDate / status / priority 的 options 在三处只维护一份
- icon token 在三处只维护一份
- `digit` / shortcut 规则在三处只维护一份
- 三套 presenter 仍各自保持当前交互能力

---

## 13. 风险与取舍

### 风险 1：抽象过早

如果一开始就把 placement / space / filter 一起打包，容易把 shared core 做复杂。

处理方式：

- 先做 `status / priority / dueDate`
- 让复杂字段后置

### 风险 2：shared core 被 UI 反向污染

如果 core 里塞太多 JSX，会重新变成具体实现层。

处理方式：

- 保持 `iconKey` / `label` / `meta` / `disabledReason` 的轻语义结构
- presenter 再做渲染映射

### 风险 3：业务转换被错误上提

placement / space 的业务值转换一旦塞进 shared core，边界就会模糊。

处理方式：

- shared core 只描述“选项是什么”
- feature adapter 负责“值怎么映射”

---

## 14. 推荐执行顺序

推荐顺序：

1. 先建 `metadata-action-spec.ts`
2. 再建 `metadata-icon-tokens.ts`
3. 迁 `dueDate`
4. 迁 `status`
5. 迁 `priority`
6. 补 context menu mapping
7. 补 command menu mapping
8. 最后做 placement / space

说明：

- `dueDate` 当前最容易漂移，也最值得先统一
- `status / priority` 次之
- `placement / space` 最复杂，放最后更稳

---

## 15. 最终目标

阶段 6 完成后，应达到：

- dropdown / 右键菜单 / command 的字段动作语义只维护一份
- 状态 / 优先级 / 截止时间不会再三处各写一套 copy
- 后续新增字段时，只需新增 spec factory 和三套 mapping
- shared 层边界清晰，不会演变成一个万能菜单怪物

最终架构原则：

**统一字段动作语义，保留最适合各自场景的 UI 壳。**
