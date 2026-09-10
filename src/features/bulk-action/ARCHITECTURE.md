# bulk-action · 批量操作引擎

> 作用：描述 **当前已落地** 的 `src/features/bulk-action` 边界  
> 最后更新：2026-09-10

---

## 1. 当前真实心智

```txt
ActionBar / Command / ContextMenu / 行快捷键
  → 构造 BulkSelectionSnapshot
  → BulkActionProvider.run(actionId, snapshot, payload?)
  → Registry 找动作定义（定义由各域贡献）
  → Runtime：可执行性 + 确认策略
  → Adapter 执行 mutation（实现由各域贡献）
  → Result → 是否清空 selection / toast
```

| 模块 | 负责 |
|------|------|
| **bulk-action** | 契约、Registry/Runtime、Provider、确认编排、result 语义、唯一 ActionBar |
| **task / project / lifecycle** | 本域 `bulk/`：动作定义 + adapter |
| **layout** | `ShellBulkActionBoundary` compose 各域 public，`ShellChrome` 将唯一 ActionBar 组合进 `ShellMain` 列表内容区 |

Selection 只提供只读上下文；每次执行时由调用方复制不可变 `BulkSelectionSnapshot`，确认与异步 mutation 均消费该次快照。ActionBar 在 `ShellMain` 列表内容容器内绝对定位、底部居中，距底部 `12px`；不随页面滚动，不覆盖 Sidebar、详情面板或 Footer，也不在页面、命令或 ContextMenu 内建立第二份 bulk 状态。任务动作依次为「打开命令菜单 → 归档 → 删除」，后两者用带命令提示的图标按钮保证窄列表可用，仍通过 Command Runtime 进入既有确认与批量执行流程。

产品操作栏使用 HeroUI Pro `ActionBar`，由 `isOpen` 驱动上游完整入场／退出动效，不在关闭时提前卸载。定位属于本组件：外层在 main 内绝对定位到底边，以上下 `12px` 透明内边距扩展动效 filter 层的绘制范围；可见 pill 距底边仍为 `12px`，不把 filter 层自身边界设在 pill 下沿。保留上游阴影、模糊／位移／淡入淡出和键盘导航，集中 recipe 只定义 pill 边框与圆角。

---

## 2. 目录结构

```txt
src/features/bulk-action/
├── ARCHITECTURE.md
├── index.ts
├── core/          # 类型 · Registry · Runtime · snapshot · result · ACTION_IDS
├── runtime/       # BulkActionProvider · hooks
├── components/    # HeroUI Pro ActionBar 组合的 BulkActionBar · toast
└── selection/     # useSectionSelection
```

域 actions / adapters 在 `features/{task,project,lifecycle}/bulk/`，不在本包。

---

## 3. 装配

```txt
layout/ShellBulkActionBoundary
  → createTaskBulkAdapter + taskBulkActions
  → createProjectBulkAdapter + projectBulkActions
  → createLifecycleBulkAdapter + lifecycleBulkActions
  → merge → <BulkActionProvider>

layout/ShellChrome
  → CommandContext + CommandRuntime
  → ShellMain 列表内容区内的单一 <BulkActionBar>
```

---

## 4. 禁止

- 在本包再写 domain 专属 mutation / 产品动作表  
- 跨 feature 深路径 import 本包内部  
- 与 selection / command 合并职责（选 ≠ 执行 ≠ 总线）
