# filter · 筛选平台

> 作用：描述 **当前已落地** 的 `src/features/filter` 边界  
> 最后更新：2026-08-22

---

## 1. 心智

```txt
View.filters / 页面基线 ──base──┐
                                ├─► effective ─────────► run_task_query / run_task_view
URL search `f` ──draft（完整替换）──┘

UI：PageFilterButton → FilterMenu → FilterValueSubMenu → FilterValueOption
    FilterBar → chip / 恢复(dirty) / Save
F → PageFilterController → adapter 发出 open-menu → FilterMenu
Shift+F → Display 面板（display-options）
命令宿主：`useRegisterFilterCommandAdapter`（最小投影：`supportsClearAll`）
```

| 概念 | 真源 |
|---|---|
| 公式 | `FilterQuery`（clause） |
| 临时 | 路由 search `f`（唯一 URL 筛选键；完整替换 base filters） |
| View 筛选 | SQLite `filters_json` |
| 显示选项 | `display-options`（只负责分组、排序与字段可见性） |
| 命令投影 | `PageFilterProvider`（最小只读投影，非第二真源） |

缺少 `f` 表示没有 Filter Draft，直接使用 base；显式空查询也是有效 Draft，用于临时清空 Saved View 的 filters。`dirty` 仅表示 Draft 与 base 不同，`FilterBar` 也只在此时出现。

`FilterBar` 独占浅灰 secondary Surface，Views 工具栏保持白底。每个条件使用白底分段 `ButtonGroup`：字段名与图标只读，不进入 Tab 顺序；运算符、值和删除分别保留原生 Dropdown / Button 交互，不使用 Toggle 的选中语义。字段与值图标复用 `filterOptionCatalog`；单值显示具体名称，多值显示数量摘要（如「3 个状态」「2 个项目」「2 个日期条件」），并按目录顺序最多重叠展示 3 个已有值图标，不为无图标的字段制造重复图标。完整名称保留在 title 和下拉选项中，即时写回规则不变。细描边、整高分隔线和圆角集中在 `components.css` 的 FilterBar hook 内；不裁切外扩焦点。条件整体换行，长值在格内省略，菜单仍能读取完整选项。

---

## 2. 目录

```txt
src/features/filter/
├── core/           # types · normalize · url-codec
├── model/
│   ├── useListFilterSession.ts
│   ├── ListFilterUiContext.tsx
│   ├── filterUiEvents.ts
│   ├── useRegisterFilterCommandAdapter.ts
│   └── PageFilterProvider.tsx   # 命令宿主注册槽
├── components/
│   ├── FilterMenu.tsx              # 一级菜单壳与 session 接线
│   ├── FilterValueSubMenu.tsx      # 二级搜索与值列表
│   ├── FilterValueOption.tsx       # 左勾选 · icon · 文案 · 可选 count
│   ├── filterOptionCatalog.tsx     # 字段值目录与 task 指示器接线
│   └── FilterBar.tsx
├── commands/
└── index.ts
```

---

## 3. Public

- 领域：`FilterQuery`、`normalize`、URL codec
- 会话：`useListFilterSession`、`ListFilterUiProvider`
- 命令：`registerFilterCommands`、`useRegisterFilterCommandAdapter`、`emitFilterUiEvent`
- UI：`PageFilterButton`、`FilterBar`；`FilterMenu` 是 Provider 内部受控组件

`PageFilterButton`、`FilterBar` 与 `FilterMenu` 必须位于 `ListFilterUiProvider` 内；缺失 Provider 是装配错误，禁止静默降级为空 UI 或占位按钮。

Filter 二级值行与 FilterBar 值菜单统一使用 `FilterValueOption`，沿用 UI Lab Labels 的 HeroUI `checkboxVariants(primary)` 展示结构与原生动画；勾选框、属性图标、文字和可选计数在同一行内以 spacing `2`（8px）排列，不再把 `Dropdown.ItemIndicator` 改画为方框。选择语义与焦点只由同一个 `menuitemcheckbox` 持有，不嵌套 Checkbox 或增加焦点，完整选项名不依赖溢出提示的子节点语义。添加筛选与值选择菜单统一 256px 宽，搜索区域内边距为左右 8px、上下 6px；一级与二级搜索框保持透明、无 hover 底色、无 ring、无搜索图标，保留清空按钮与高对比模式焦点。选项保持目录顺序，不按已选状态重新分组。

status / priority 的文案与图标只从 `@/features/task/presentation` 读取，不在 filter 内维护第二套定义。菜单选择即时写入 `session.replaceEffective`：添加筛选时点击勾选框保持两级菜单打开，点击行其余区域或键盘确认则关闭整个下拉并返回入口焦点；FilterBar 已有条件的值编辑由 Menu `onSelectionChange` 统一写回，继续保持打开且不允许清空最后一个值。`registerFilterCommands` 只转发 controller action；UI event 由 controller adapter 发出，禁止命令桥重复发送。

---

## 4. 禁止

- 外模块深路径 import
- UI 内复制查询映射
- 第二套扁平筛选状态驱动 list 查询
- display-options 与 filter 交叉持有对方业务状态
