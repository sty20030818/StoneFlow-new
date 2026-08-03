# filter · 筛选平台

> 作用：描述 **当前已落地** 的 `src/features/filter` 边界  
> 最后更新：2026-08-03

---

## 1. 心智

```txt
URL search `f` ──temp──┐
                       ├─► effective ──adapt──► list_tasks / run_view
View.filters ──base────┘

UI：PageFilterButton → FilterMenu
    FilterBar → chip / Clear(dirty) / Save
F → emitFilterUiEvent → FilterMenu
Shift+F → Display 面板（display-options）
命令宿主：useRegisterFilterCommandAdapter（最小投影：hasActive / showCompleted / 能力位）
```

| 概念 | 真源 |
|---|---|
| 公式 | `FilterQuery`（clause） |
| 临时 | 路由 search `f`（唯一 URL 筛选键） |
| View 筛选 | SQLite `filters_json` |
| 显示选项 | `display-options`（含 `showCompleted`） |
| 命令投影 | `PageFilterProvider`（最小只读投影，非第二真源） |

---

## 2. 目录

```txt
src/features/filter/
├── core/           # types · normalize · url-codec · adapt
├── model/
│   ├── useListFilterSession.ts
│   ├── ListFilterUiContext.tsx
│   ├── filterUiEvents.ts
│   ├── useRegisterFilterCommandAdapter.ts
│   └── PageFilterProvider.tsx   # 命令宿主注册槽
├── components/     # PageFilterButton · FilterMenu · FilterBar
├── commands/
└── index.ts
```

---

## 3. Public

- 领域：`FilterQuery`、`normalize`、`adaptFilterQueryToListTasks`、URL codec
- 会话：`useListFilterSession`、`ListFilterUiProvider`
- 命令：`registerFilterCommands`、`useRegisterFilterCommandAdapter`、`emitFilterUiEvent`
- UI：`PageFilterButton`、`FilterBar`、`FilterMenu`

---

## 4. 禁止

- 外模块深路径 import
- UI 内复制 adapt 映射
- 第二套扁平筛选状态驱动 list 查询
- display-options 与 filter 交叉持有对方业务状态
