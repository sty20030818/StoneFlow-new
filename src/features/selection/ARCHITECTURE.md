# selection · 选择平台

> 作用：描述 **当前已落地** 的 `src/features/selection` 边界  
> 最后更新：2026-08-19

---

## 心智

```txt
列表选中态 ≠ 命令选中上下文 ≠ bulk 执行

CommandSelectionProvider
  → 页 registerCommandSelection(snapshot)

列表 → useCollectionInteraction / useGroupedCollectionInteraction
真实 DOM → CollectionGridRoot / Row / GroupTrigger
域 builder（在各 domain）：
  buildTaskCommandSelection | buildProjectCommandSelection | buildLifecycleCommandSelection
```

## Public

- `CommandSelectionProvider` · `useRegisterCommandSelection`
- `useCollectionInteraction` · `useGroupedCollectionInteraction`
- `CollectionGridRoot` · `CollectionGridRow` · `CollectionGridGroupTrigger`
- `useCollectionKeyboardAdapter`（Registry 驱动的导航、范围切换与 Escape 清空）

**不在本包：** `build*CommandSelection` → 各域 public

React Stately manager 是每个集合唯一的 `selectedKeys` / `focusedKey` Owner；collection interaction 只保存 Shift 手势所需的最小方向元数据，并以 stable key/ref bridge 恢复虚拟行真实焦点。Pointer hover 只是瞬时输入来源，不建立 keyboard-hover、第二份 current 或重复 selection。
