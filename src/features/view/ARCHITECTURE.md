# view · 保存视图

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。  
> 最后更新：2026-09-13（保存会话、导航与失败恢复）

---

## 1. 心智

```txt
View 定义 = scope + context + baseViewKey + filters

/views
  → ViewsPage + useSavedViewLibraryScene
  → 仅搜索与管理 Saved View，不执行任务查询

/views/:viewId
  → SavedViewPage + useSavedViewWorkspaceScene
  → TaskWorkspace + TaskBoard
  → run_task_view(viewId, scope, dirty ? draft : undefined)

Save
  → create：保存当前 context、baseViewKey 与 effective filters
  → overwrite：只覆盖当前 Saved View 的 filters
  → 不写 Display
```

`context` 是不可移除的查询边界；URL `f` 是 filters 的完整临时替换，不得覆盖
`scope/context/baseViewKey`。Default View 是页面内代码定义的选项，不是 View 实体。
不存在 System View 兼容实体。

`filters_json` 的旧扁平形状只在 Rust 存储解码边界读取：可无损表达的条件转换为
`FilterQuery`；当前模型无法表达的旧条件显式失败，禁止近似后返回错误结果。
无效旧定义仍以“需要重建”留在 Library，允许删除但不可编辑或执行；单条坏数据不得拖垮列表。

创建、另存、覆盖与重命名统一由 `useViewSaveFlow` 持有 mutation、提交锁、错误与会话有效性。
场景提供提交时的完整定义；覆盖只交付当前有效 View 的 ID 与 filters，重命名只交付 ID 与名称。
`ViewSaveDialog` / `ViewEditorDialog` 只持有表单输入、组合业务流程状态与交互组件。
保存成功后用实际返回 ID 打开无 Draft 的目标 URL；打开失败保留 saved ID，重试只打开、不再次创建。
失败保留输入与来源 Draft；关闭、换来源或开启新会话后，旧请求仍完成 mutation 及缓存失效，
但不得导航、清理新 Draft、关闭新弹窗或展示旧错误。弹窗置于工作区 overlays，避免 FilterBar
因 base 更新而变 clean 时卸载仍需恢复的保存会话。

查询只读取当前渲染路由的 search。跨查询 key 不展示可操作的旧结果；同 key 后台刷新保留已有数据。
base 加载或刷新不自动清除等价 Draft；URL 写入只发生在用户编辑、恢复或成功导航时。

删除操作由 Library 与详情共用 `ViewActionsMenu`：请求完成前锁定该记录的操作，
失败保留记录并在菜单内提供可感知错误和重试。关闭再打开菜单不会重复发起仍在进行的删除，
旧菜单的迟到结果不打开或关闭新菜单。详情删除成功后的导航属于 scene，且仅在来源仍未切换时执行。
键盘与浮层焦点沿用 HeroUI / ListView 的集合行为，不另建焦点系统。

跨模块 **只** `import { … } from '@/features/view'`。  
**禁止** `features/view` → `@/layout/**`。

---

## 2. 目录结构

```txt
src/features/view/
├── ARCHITECTURE.md
├── index.ts
├── api/views.ts · viewSearch.ts
├── hooks/ … useSavedViewLibraryScene · useSavedViewWorkspaceScene · useViewSaveFlow
└── components/
    ├── ViewsPage · SavedViewPage
    ├── ViewActionsMenu
    └── ViewEditorDialog · ViewSaveDialog · form
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 页面 | `ViewsPage`、`SavedViewPage` |
| 管理交互 | `ViewEditorDialog`、`ViewSaveDialog`、`ViewActionsMenu`（UI Lab 复用生产组件） |
| 保存用例 | `useViewSaveFlow`（Default 场景与 Saved 场景共用） |
| 数据 | `useViewsQuery` |
| Search | `parseViewSearch`（仅 `f`） |

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| filter | session + FilterBar/Menu；filters 同 FilterQuery |
| display-options | 仅呈现；pageKey = view |
| task-workspace | Saved View 详情与默认任务页共用唯一工作区组合 |
| task | TaskBoard / collection public |
| page-frame | Saved View Library 的页面布局 |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + view vitest）。
