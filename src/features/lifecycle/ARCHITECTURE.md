# lifecycle · 归档 / 回收站编排

> 作用：描述 **当前已落地** 的 `src/features/lifecycle` 边界  
> 最后更新：2026-07-17

---

## 1. 心智

```txt
routes 薄页 mode=archive|trash → LifecycleList
批量 → bulk/ + registerLifecycleCommands
```

跨模块只 `@/features/lifecycle`。**禁止** → `@/layout/**`。

---

## 2. 目录

```txt
api/ · hooks/ · bulk/ · commands/ · model/ · components/
```

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 页面 | `LifecycleList` · `LifecycleBoard` |
| IO | list / restore / delete / permanentlyDelete |
| 批量 | `lifecycleBulkActions` · `createLifecycleBulkAdapter` |
| 命令选中 | `buildLifecycleCommandSelection` |
| 命令 handlers | `registerLifecycleCommands` |
