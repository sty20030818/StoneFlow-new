# selection · 选择平台

> 作用：描述 **当前已落地** 的 `src/features/selection` 边界  
> 最后更新：2026-09-09

---

## 心智

```txt
列表选中态 ≠ 命令选中上下文 ≠ bulk 执行

CommandSelectionProvider
  → 页 registerCommandSelection(snapshot)

列表 → useCollectionInteraction / useGroupedCollectionInteraction
真实 DOM → CollectionGridRoot / useCollectionGridRow / useCollectionGridGroupTrigger
域 builder（在各 domain）：
  buildTaskCommandSelection | buildProjectCommandSelection | buildLifecycleCommandSelection
```

## Public

- `CommandSelectionProvider` · `useRegisterCommandSelection`
- `useCollectionInteraction` · `useGroupedCollectionInteraction`；只需要 collection 内核的跨 feature 消费者走 `@/features/selection/contract`，避免加载命令宿主与 DOM 组件
- `CollectionGridRoot` · `useCollectionGridRow` · `useCollectionGridGroupTrigger`
- `useCollectionKeyboardAdapter`（Registry 驱动的导航、范围切换与 Escape 清空）

**不在本包：** `build*CommandSelection` → 各域 public

React Stately manager 是每个集合唯一的 `selectedKeys` / `focusedKey` Owner；projection 建立 key-to-index Map，同时承担 membership 与邻接定位，导航、折叠、范围和校验复用同一派生，不在按键热路径线性扫描。collection interaction 只保存 Shift 手势所需的最小方向元数据，并以 stable key/ref bridge 恢复虚拟行真实焦点。集合根通过 `data-focus-source` 暴露 keyboard / pointer，Row CSS 在键盘态抑制静止指针的旧 hover；`pointerdown` 恢复 pointer，禁止逐 Row `pointermove` 与第二份 current。

非虚拟 Grid 的 Root 直接组合 children，通过私有 context 共享焦点桥与交互来源；分组和行在自身组件中调用对应 hook，将 ref/事件连接真实 DOM。页面不再透传 RootState，也不以 render-prop 调用携带 ref 的回调。该 context 不包含滚动帧状态；TaskBoard 的虚拟滚动与 sticky 仍由各自 owner 管理。
