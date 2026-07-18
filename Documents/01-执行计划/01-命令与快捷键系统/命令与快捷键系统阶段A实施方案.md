# StoneFlow 命令与快捷键系统阶段 A 实施方案

> 创建日期：2026-05-16
> 所属计划：第二轮收口计划 · 阶段 A
> 阶段目标：建立稳定 selection snapshot，并接入 `Esc` 清空多选的层级规则。

---

## 1. 阶段 A 边界

### 1.1 本阶段要做

- 扩展当前任务选择状态，让 selection 能稳定表达“当前选中了哪些任务”。
- 为后续 Command Context 和 Command Menu chips 准备 selection snapshot。
- 接入 `Esc` 清空多选状态。
- 明确 `Esc` 不穿透弹层的优先级。
- 补选择状态与 `Esc` 行为测试。

### 1.2 本阶段不做

- 不做 Command Menu selected chips。
- 不做“批量操作”board。
- 不做 `P / S / D` scoped picker。
- 不做 `Shift+↑/↓` 范围多选。
- 不做项目多选通用化。
- 不改 Tauri / Rust。

---

## 2. 当前代码基线

当前相关代码：

```txt
src/features/task/model/useTaskSelection.ts
src/features/task/shortcuts/TaskRowShortcutScope.tsx
src/features/command/shortcuts/CommandShortcutLayer.tsx
src/features/command/shortcuts/use-command-shortcuts.ts
src/shared/ui/bulk-action-bar.tsx
```

当前选择状态特点：

- `useTaskSelection(taskIds)` 是页面本地 hook；
- 返回 `selectedTaskIds / selectedTaskIdSet / selectedCount / toggleTaskSelection / clearTaskSelection`；
- 数据刷新后会剔除失效 id；
- Row 层快捷键通过 `selectedTaskIdSet` 判断多选；
- 目前没有 selection snapshot；
- 目前 `Esc` 没有统一清空 selection 的应用内命令语义。

---

## 3. 推荐实现方案

### 3.1 先扩展 `useTaskSelection`，不新增复杂 Provider

阶段 A 不建议一上来新增全局 `SelectionProvider`。原因：

- 当前 selection 是页面局部状态；
- Command Context 读取 selection 是阶段 B；
- 现在如果先做全局 Provider，容易扩大改动面；
- KISS 做法是先把现有 hook 的能力补齐，再在阶段 B 把 snapshot 暴露给 Command Context。

阶段 A 先在 `useTaskSelection` 中补：

```ts
type TaskSelectionSnapshot = {
  type: 'task'
  ids: string[]
  idSet: Set<string>
  count: number
  hasSelection: boolean
  isSingleSelection: boolean
  isMultiSelection: boolean
}
```

返回值建议变成：

```ts
return {
  selectedTaskIds,
  selectedTaskIdSet,
  selectedCount,
  selectionSnapshot,
  toggleTaskSelection,
  clearTaskSelection,
}
```

兼容性：

- 保留旧字段，不破坏现有页面；
- 新增 `selectionSnapshot` 只供后续阶段使用；
- 不重命名 `clearTaskSelection`，避免一次性改太多调用点。

### 3.2 补一个通用 selection 工具函数

建议新增纯函数，便于测试：

```txt
src/features/task/model/taskSelection.ts
```

包含：

```ts
export function pruneTaskSelection(selectedIds: string[], validIds: string[]): string[]
export function toggleTaskIdSelection(selectedIds: string[], taskId: string): string[]
export function buildTaskSelectionSnapshot(selectedIds: string[]): TaskSelectionSnapshot
```

理由：

- `useTaskSelection` 保持薄 hook；
- 选择逻辑可单测；
- 后续 `Shift+↑/↓` 可以继续往这个文件加纯函数，不污染 React hook。

不建议本阶段做通用 `entitySelection.ts`，因为项目多选还没进入实施。

### 3.3 接入 `Esc` 的最小方式

推荐新增一个很小的页面级 hook，而不是把 `Esc` 塞进全局 `CommandShortcutLayer`。

```txt
src/features/task/shortcuts/useTaskSelectionEscape.ts
```

职责：

- 监听 `keydown`；
- 只处理 `Escape`；
- 有 selection 时清空；
- 如果上层弹层存在则不处理；
- 输入态不处理；
- 事件被处理时 `preventDefault()`。

示意逻辑：

```ts
if (event.key !== 'Escape') return
if (event.defaultPrevented) return
if (isEditableTarget(event.target)) return
if (isBlockedByHigherLayer()) return
if (!hasSelection) return

event.preventDefault()
clearTaskSelection()
```

为什么不直接加到全局 `CommandShortcutLayer`：

- `CommandShortcutLayer` 当前只知道 command id，不知道页面的 `clearTaskSelection`；
- 阶段 A 还没做全局 selection provider；
- 把页面 selection 清空逻辑塞进全局层，会制造临时耦合；
- 阶段 B/C 后可再把它收口成 `general.close` 的 command 语义。

### 3.4 弹层阻断规则

阶段 A 的 `Esc` 清空多选必须低于这些层：

```txt
Dropdown / Select Menu / Context Menu
> Modal / AlertDialog
> Command Menu
> Detail Drawer / Preview Drawer
> Selection Clear
```

当前可以用 DOM selector 做保守阻断，和 `TaskRowShortcutScope` 保持一致：

```txt
[cmdk-root]
[data-slot="dialog-content"]
[data-slot="dropdown-menu-content"]
[data-slot="context-menu-content"]
```

注意：

- shadcn `AlertDialog` 通常也走 dialog content，因此会被阻断；
- 后续如果 Drawer 也需要阻断，要确认 Drawer 是否有稳定 data-slot；
- 不建议阶段 A 为弹层系统新建复杂 layer manager。

### 3.5 页面接入方式

每个使用 `useTaskSelection` 的任务列表页面，在拿到 `clearTaskSelection` 后接入：

```ts
useTaskSelectionEscape({
  hasSelection: selectedCount > 0,
  clearSelection: clearTaskSelection,
})
```

优先接入任务列表主链页面：

- Inbox；
- All Tasks；
- No Project；
- Project Page；
- Views Page。

Project Overview 里当前也复用 `useTaskSelection` 做项目选择，但阶段 A 不建议强行纳入。原因是类型语义还是 task 命名，先避免扩大歧义。

---

## 4. 文件改动范围

### 4.1 新增文件

```txt
src/features/task/model/taskSelection.ts
src/features/task/model/taskSelection.test.ts
src/features/task/shortcuts/useTaskSelectionEscape.ts
src/features/task/shortcuts/useTaskSelectionEscape.test.tsx
```

### 4.2 修改文件

```txt
src/features/task/model/useTaskSelection.ts
src/features/task/shortcuts/index.ts
src/features/inbox/ui/InboxPage.tsx
src/features/all-tasks/ui/AllTasksPage.tsx
src/features/no-project/ui/NoProjectPage.tsx
src/features/project/ui/ProjectPage.tsx
src/features/views/ui/ViewsPage.tsx
```

是否修改 `ProjectOverviewPage.tsx`：

- 本阶段建议不改；
- 如果必须统一，可以只接 `Esc` 清空，不引入 task snapshot 语义；
- 更干净的做法是在后续项目选择阶段单独处理。

---

## 5. 具体任务拆分

### 5.1 任务 A1：抽出选择纯函数

实现：

- `pruneTaskSelection`；
- `toggleTaskIdSelection`；
- `buildTaskSelectionSnapshot`。

验收：

- 顺序稳定；
- 重复 id 不引入重复选择；
- valid ids 改变后能剔除失效项；
- 空 selection snapshot 字段正确。

### 5.2 任务 A2：扩展 `useTaskSelection`

实现：

- 用纯函数替换 hook 内部重复逻辑；
- 返回 `selectionSnapshot`；
- 保持旧返回字段不变；
- `clearTaskSelection` 空选择时保持引用更新最少。

验收：

- 现有页面不需要改调用方式也能编译；
- 现有 selection 行为不回归；
- 新 snapshot 可用于阶段 B。

### 5.3 任务 A3：实现 `useTaskSelectionEscape`

实现：

- 只监听 `Escape`；
- 弹层阻断；
- 输入态阻断；
- 有 selection 时清空；
- 清空时阻止默认事件。

验收：

- 没有 selection 时不处理；
- 有 selection 时调用 clear；
- Command Menu / Dialog / Dropdown 存在时不调用 clear；
- input / textarea / contenteditable 中不调用 clear。

### 5.4 任务 A4：接入主任务列表页面

接入页面：

- Inbox；
- All Tasks；
- No Project；
- Project Page；
- Views Page。

验收：

- 每个页面多选后 `Esc` 清空；
- 底部 `BulkActionBar` 随 selection 清空消失；
- 页面原有批量按钮不回归。

### 5.5 任务 A5：文档同步

更新：

- 第二轮收口计划阶段 A 状态；
- 实现清单中增加阶段 A 已完成项；
- 如有差异，补充实际实现说明。

---

## 6. 测试计划

### 6.1 单元测试

建议新增：

```txt
src/features/task/model/taskSelection.test.ts
```

覆盖：

- toggle 选中；
- toggle 取消；
- prune 失效 id；
- snapshot 单选；
- snapshot 多选；
- snapshot 空状态。

### 6.2 Hook 测试

建议新增：

```txt
src/features/task/shortcuts/useTaskSelectionEscape.test.tsx
```

覆盖：

- `Escape` 清空；
- 无 selection 不清空；
- input 中不清空；
- Command Menu 存在不清空；
- Dialog 存在不清空；
- Dropdown 存在不清空。

### 6.3 页面轻量验证

如果已有页面测试过重，可以先不为每个页面写集成测试。阶段 A 最低要求：

- hook 测试覆盖行为；
- 至少一个页面通过渲染测试或手工验证确认接入有效；
- 后续阶段 B/C 做 Command Menu selection 集成测试。

---

## 7. 风险与取舍

| 风险 | 说明 | 处理 |
|---|---|---|
| 页面都要手动接 `useTaskSelectionEscape` | 有重复接入成本 | 阶段 A 接受；阶段 B/C 再收口到 Provider。 |
| DOM selector 阻断不够优雅 | 但改动小、符合当前 Row 层做法 | 先保持一致，后续再做 layer manager。 |
| Project Overview 也用 `useTaskSelection` | 命名是 task，但实际选项目 | 阶段 A 不扩大处理，后续项目选择阶段单独清理。 |
| `Esc` 与 route goBack 冲突 | 当前只在有 selection 时处理 | 无 selection 时不拦截，降低风险。 |

---

## 8. 阶段 A 验收清单

- [ ] `useTaskSelection` 返回 `selectionSnapshot`，旧 API 不破坏。
- [ ] 选择纯函数有单测。
- [ ] `Escape` 在有任务 selection 时清空 selection。
- [ ] `Escape` 不穿透 Command Menu / Dialog / Dropdown / Context Menu。
- [ ] 输入态不触发清空。
- [ ] Inbox / All Tasks / No Project / Project Page / Views Page 接入。
- [ ] 多选清空后 `BulkActionBar` 消失。
- [ ] 没有新增全局散装业务监听，监听职责仍在 task shortcut 层。

