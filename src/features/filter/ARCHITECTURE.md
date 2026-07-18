# filter · 页级筛选平台

> 作用：描述 **当前已落地** 的 `src/features/filter` 边界  
> 最后更新：2026-07-17

---

## 1. 心智

```txt
ShellProviders → PageFilterProvider
列表页 → register controller（任务页 controller 在 task）
命令 → registerFilterCommands(host)
```

本包只做 **平台**：上下文、类型、通用日期/完成判定工具。

---

## 2. Public

- `PageFilterProvider` · `usePageFilterContext` · `useRegisterPageFilterController`
- 类型与 `hasTaskDate` / `isTaskCompleted` / `resolveTaskDateValue`
- `registerFilterCommands`（打开 picker / 切换已完成 / 清空）

**不在本包：** `useTaskPageFilterController` → `@/features/task`
