# Display Options 说明书

本文档面向后续在 `src/features/display-options` 下继续实现的开发者与 AI。

它不重复完整架构约束，重点回答：

1. 这个 feature 到底怎么接入页面；
2. 新增一个显示选项时应该改哪里；
3. 哪些地方能复用，哪些地方不能顺手混用。

详细边界请先读 [ARCHITECTURE.md](./ARCHITECTURE.md)。

---

## 1. 这个 feature 是干什么的

`display-options` 负责页面显示层，不负责任务业务层。

它统一管理：

1. 布局：`list / board`
2. 分组：`groupBy / subGroupBy`
3. 排序：`orderBy / orderDirection / completedOrder`
4. 字段显示：`visibleProperties`
5. 偏好持久化：`workspace default + personal override`

一句话理解：

> `task` 决定任务是什么，`view` 决定要哪些任务，`display-options` 决定这些任务怎么摆出来。

---

## 2. 第一阶段服务哪些页面

第一阶段只服务任务相关页面：

1. `All Tasks`
2. `Inbox`
3. `No Project`
4. `Project Detail`
5. `ViewsPage`
6. 系统任务页：`today / focus / upcoming / overdue / completed / canceled / archived`

不服务：

1. Project Overview
2. Lifecycle 页
3. Settings 页自身

---

## 3. 目录建议

第一阶段建议按下面结构开始建代码：

```txt
src/features/display-options/
├── ARCHITECTURE.md
├── README.md
├── core/
│   ├── display-page-key.ts
│   ├── task-display-options.ts
│   ├── task-display-defaults.ts
│   ├── task-display-capabilities.ts
│   ├── task-display-normalize.ts
│   └── index.ts
├── api/
│   ├── displayOptions.ts
│   └── displayOptions.test.ts
├── model/
│   ├── useTaskDisplayOptions.ts
│   ├── taskDisplayOptions.keys.ts
│   ├── taskDisplayOptions.queries.ts
│   ├── taskDisplayOptions.mutations.ts
│   └── index.ts
├── adapters/
│   └── task/
│       ├── task-display-apply.ts
│       ├── task-display-compare.ts
│       ├── task-display-groups.ts
│       ├── task-display-properties.ts
│       └── index.ts
└── ui/
    ├── DisplayOptionsButton.tsx
    ├── DisplayOptionsPopover.tsx
    ├── DisplayOptionsPanel.tsx
    ├── PropertyToggleGrid.tsx
    └── index.ts
```

说明：

1. `core` 放真源模型；
2. `api` 放持久化调用；
3. `model` 放 React 编排；
4. `adapters/task` 放真正的任务显示计算；
5. `ui` 只做面板渲染。

---

## 4. 页面如何接入

页面接入固定遵循这个顺序：

```txt
1. 页面构造 DisplayPageKey
2. 页面拿原始任务数据
3. 页面调用 useTaskDisplayOptions(pageKey)
4. 页面把 items + resolvedOptions 喂给 task display adapter
5. 页面把 adapter 结果交给 EntityScene / TaskBoard
```

最小接入示意：

```ts
const pageKey = 'task:all'
const rawItems = taskList.items
const display = useTaskDisplayOptions(pageKey)
const resolved = applyDisplayOptionsToTasks({
  items: rawItems,
  options: display.options,
  context: { pageKey },
})
```

然后页面只消费：

1. `resolved.items`
2. `resolved.sections`
3. `resolved.visibleProperties`
4. `resolved.layout`

说明：

1. `resolved.visibleProperties` 需要继续透传到 `TaskBoard / TaskRowAdapter`，不能只停留在面板状态。

---

## 5. 接入 toolbar 的方式

统一入口必须挂在 `EntityScene.toolbarDisplayAction`。

说明：

1. `toolbarFilterAction` 是第一个按钮位，保留给原有筛选 / 视图管理入口；
2. `toolbarDisplayAction` 是第二个按钮位，专门承载 display options。

不要：

1. 在页面 header action 里重复再加一个排序按钮；
2. 在 `MainCard.Toolbar` 默认占位逻辑里硬写页面特化；
3. 为 `ViewsPage` 单独做第二套按钮。

正确做法：

1. 页面拿到 `display-options/ui` 导出的入口组件；
2. 把 `pageKey`、`resolvedOptions`、`actions` 传进去；
3. `EntityScene` 只负责摆放，不负责实现逻辑。

---

## 6. 新增一个排序字段时改哪里

例如要新增 `remindAt`：

1. 先改 `core/task-display-options.ts`
2. 再改 validator / normalizer
3. 再改 `adapters/task/task-display-compare.ts`
4. 再改 `ui` 的排序选项
5. 最后补测试

不要反过来先在 UI 下拉里加选项。

顺序必须是：

```txt
schema
-> normalize
-> adapter
-> ui
-> tests
```

---

## 7. 新增一个分组字段时改哪里

例如要新增 `reminder`：

1. 先确认任务域是否真的有稳定字段；
2. 改 `TaskGroupBy` 枚举；
3. 改 `task-display-groups.ts`；
4. 改 capability matrix；
5. 改 UI 选项；
6. 补测试。

如果任务域没有稳定字段，禁止先加 display option。

---

## 8. 哪些现有能力可以直接复用

可以复用：

1. `EntityScene.toolbarDisplayAction`
2. `MainCard.Toolbar` 的按钮承载位
3. `View` 现有 query 链路拿任务候选集
4. `TaskBoard` 和 `BoardGroup` 的渲染能力
5. `settings` 作为 key-value 持久化宿主

不要直接复用：

1. `ViewEditorDialog` 的表单结构作为运行时面板
2. `taskBoardOrder.ts` 作为长期排序真源
3. 任务页各自的页面级排序判断
4. 现在后端普通 `list_tasks` 的固定排序结果作为最终显示真相

原因：

1. `ViewEditorDialog` 是“保存视图”表单，不是“页面显示”面板；
2. `taskBoardOrder.ts` 现在只处理视觉状态顺序，不是完整 display engine；
3. 后端默认排序里仍存在 `position` 被全局误用的问题。

---

## 9. 第一阶段推荐默认值

### `task:all`

1. `layout = list`
2. `groupBy = status`
3. `orderBy = smart`
4. `visibleProperties = [status, priority, project, dueAt]`

### `task:inbox`

1. `layout = list`
2. `groupBy = none`
3. `orderBy = inboxAt`
4. `orderDirection = desc`

### `task:project-detail`

1. `layout = list`
2. `groupBy = status`
3. `orderBy = manual`

### `task:view:<viewId>`

1. 页面运行时显示偏好独立存储；
2. 不强行复用 `View.sort` 作为用户当前显示真相。

---

## 10. 第一阶段不该做什么

明确不要做：

1. 把 sub-issue 开关先做成假按钮；
2. 把 Project/Lifecycle 一起一步接完；
3. 为了未来扩展先造一个通用实体 DSL；
4. 在页面里保留旧排序，再叠一层新排序；
5. 一边实现一边继续放大 `ViewEditorDialog`。

---

## 11. 测试建议

第一阶段至少覆盖：

1. `resolveTaskDisplayOptions()` 的 merge 行为
2. `smart` 排序稳定性
3. `manual` 只在受支持页面启用
4. `today / upcoming / completed` 等特殊页排序
5. `groupBy / subGroupBy` 生成 sections 的正确性
6. `visibleProperties` 对 Row adapter 输出的影响
7. reset / set default / personal override 的 query 行为

---

## 12. 给后续实现者的硬规则

1. 页面组件不允许直接写比较器。
2. 页面组件不允许直接合并 workspace default 和 personal override。
3. 运行时 display config 不允许继续塞进 `ViewEditorDialog`。
4. `position` 不允许再作为全局任务页默认主排序键。
5. `manual` 排序只能在单容器语义明确时开放。
6. 新增 display option 前，先确认任务域有没有真实字段支撑。

---

## 13. 参考资料

官方参考：

1. Linear Display options：`https://linear.app/docs/display-options`
2. Linear Custom views：`https://linear.app/docs/custom-views`

仓库内相关真源：

1. `src/shared/types/view.ts`
2. `src/features/view/ui/ViewEditorDialog.tsx`
3. `src/features/task/model/taskBoardOrder.ts`
4. `src/app/layouts/entity-scene/EntityScene.tsx`
5. `src/app/layouts/main-card/MainCardLayout.tsx`
