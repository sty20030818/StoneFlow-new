# metadata-fields · 元数据控件平台

> 作用：描述 **当前已落地** 的 `src/features/metadata-fields` 边界  
> 最后更新：2026-07-17

---

## 心智

```txt
通用下拉 / 日期 / placement UI
  → core 工厂与 dropdown 映射
  → 图标：renderMetadataActionIcon
       · 日历/placement → lucide（本包）
       · status/priority → setMetadataDomainIconRenderer
         （task 在 ShellProviders 调用 registerTaskMetadataIcons 注入）

placement 类型与 groups
  → @/features/task/contract（本包 re-export 供 UI 使用）
```

**禁止** 本包直接 import task 的 `PriorityIcon` / `TaskStatusIndicator` 组件。

---

## 目录

```txt
core/ · components/ · adapters/
```
