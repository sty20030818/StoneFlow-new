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

Filter 二级值行直接组合 HeroUI `Dropdown.ItemIndicator`，选择语义由同一个 `menuitemcheckbox` 持有；status / priority 的文案与图标只从 `@/features/task/presentation` 读取，不在 filter 内维护第二套定义。菜单选择即时写入 `session.replaceEffective`，并保持一级、二级菜单打开。`registerFilterCommands` 只转发 controller action；UI event 由 controller adapter 发出，禁止命令桥重复发送。

---

## 4. 禁止

- 外模块深路径 import
- UI 内复制查询映射
- 第二套扁平筛选状态驱动 list 查询
- display-options 与 filter 交叉持有对方业务状态
