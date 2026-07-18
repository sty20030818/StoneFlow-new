# global-search · 全局搜索

> 作用：描述 **当前已落地** 的 `src/features/global-search` 边界  
> 最后更新：2026-07-18

---

## 1. 职责 / 不负责

**负责：**

- 跨实体搜索 API（`searchEntities`）与 Query hook
- Header 搜索框、结果列表 UI
- 搜索结果 → 任务/项目详情路径解析
- 搜索框聚焦 intent（命令 / 快捷键唤起）

**不负责：**

- 命令板自身的选项与 handler（→ `@/features/command`）
- 实体详情打开策略（→ `@/features/entity-detail` / `app/navigation`）
- Launcher 窗口编排（→ `@/features/launcher`，仅复用 `searchEntities`）

---

## 2. 目录（简树）

```txt
src/features/global-search/
├── ARCHITECTURE.md
├── index.ts
├── api/searchEntities.ts
├── hooks/                # searchKeys · useSearchEntitiesQuery
├── model/
│   ├── useGlobalSearch.ts
│   ├── useSearchFocusIntentStore.ts
│   └── searchNavigation.ts
└── components/
    ├── GlobalSearchInput.tsx
    └── GlobalSearchResults.tsx
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| API | `searchEntities` · `SearchEntitiesInput` |
| Query | `useSearchEntitiesQuery` · `searchKeys` |
| 组合 | `useGlobalSearch` |
| 聚焦 | `useSearchFocusIntentStore` · `selectSearchFocusRequestVersion` |
| 导航 | `resolveTaskSearchTargetPath` · `resolveProjectSearchTargetPath` |
| UI | `GlobalSearchInput` · `GlobalSearchResults` |

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import
- 结果展示可依赖 `task` public（状态/优先级图标与文案），不拉取任务列表逻辑
- 不在本域注册命令或处理路由装配

---

## 5. 装配点

| 位置 | 挂载 |
|------|------|
| `layout/ShellHeader.tsx` | `GlobalSearchInput` · `resolveProjectSearchTargetPath` |
| `layout/model/useShellCommandSystem.ts` | `useSearchFocusIntentStore`（聚焦搜索框） |
| `features/command` 命令板 | `useGlobalSearch` |
| `features/launcher` | `searchEntities` |

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| 输入关键词 | **UI** `GlobalSearchInput` 本地 state |
| 防抖后查询 | **Query** `searchKeys` + `useSearchEntitiesQuery` |
| 聚焦请求 | **UI** Zustand `useSearchFocusIntentStore` |
| 选中结果导航 | **URL** 经 `app/navigation` 跳到任务/项目路径 |
