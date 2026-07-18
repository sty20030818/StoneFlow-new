# workspace · 工作区数据同步

> 作用：描述 **当前已落地** 的 `src/features/workspace` 边界  
> 最后更新：2026-07-18

---

## 1. 职责 / 不负责

**负责：**

- 监听 Tauri IPC 与前端 workspace 事件
- 按当前 `Scope` 定向 invalidate 已加载 Query（tasks / projects / spaces / lifecycle / views）
- debounce 合并短时间连续刷新

**不负责：**

- 同步副本状态展示（→ `@/features/sync`）
- 具体 Query key 定义（→ 各业务域 + `shared/query/invalidation`）
- 路由、侧栏、scope 切换 UI（→ `layout` · `@/features/space`）

---

## 2. 目录（简树）

```txt
src/features/workspace/
├── ARCHITECTURE.md
├── index.ts
└── model/
    ├── useWorkspaceSync.ts
    └── useWorkspaceSync.test.tsx
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| Hook | `useWorkspaceSync(scope: Scope)` |

仅此一个导出；无组件、无 Provider。

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块 import 本 feature（仅 `index.ts` public）
- 不直接 mutate 业务数据；只 `invalidateWorkspaceQueries`
- 不把 sync 配置/状态 UI 放进本域

---

## 5. 装配点

| 位置 | 挂载 |
|------|------|
| `layout/ShellRouteLayout.tsx` | `useWorkspaceSync(scope)`（壳 route 级，随 scope 挂载） |

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| 当前 scope | **入参**（来自壳 route，非本域 store） |
| 数据新鲜度 | **Query** cache（invalidate 后由各域重新 fetch） |
| 事件监听 | **UI** hook 内 `useEffect` 订阅（无持久化） |
