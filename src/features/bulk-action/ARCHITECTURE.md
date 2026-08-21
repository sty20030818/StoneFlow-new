# bulk-action · 批量操作引擎

> 作用：描述 **当前已落地** 的 `src/features/bulk-action` 边界  
> 最后更新：2026-08-20

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
| **layout** | `ShellBulkActionBoundary` compose 各域 public，`ShellLayoutContent` 挂载唯一 ActionBar |

Selection 只提供只读上下文；每次执行时由调用方复制不可变 `BulkSelectionSnapshot`，确认与异步 mutation 均消费该次快照。ActionBar 是壳层唯一 viewport-fixed 表面，不在页面、命令或 ContextMenu 内建立第二份 bulk 状态。

---

## 2. 目录结构

```txt
src/features/bulk-action/
├── ARCHITECTURE.md
├── index.ts
├── core/          # 类型 · Registry · Runtime · snapshot · result · ACTION_IDS
├── runtime/       # BulkActionProvider · hooks
├── components/    # HeroUI Pro BulkActionBar · toast
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

layout/ShellLayoutContent
  → CommandContext + CommandRuntime
  → 单一 viewport-fixed <BulkActionBar>
```

---

## 4. 禁止

- 在本包再写 domain 专属 mutation / 产品动作表  
- 跨 feature 深路径 import 本包内部  
- 与 selection / command 合并职责（选 ≠ 执行 ≠ 总线）
