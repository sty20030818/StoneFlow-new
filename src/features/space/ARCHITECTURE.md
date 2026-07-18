# space · 空间域

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-07-19

---

## 1. 心智

```txt
Space 实体
  → api / hooks：可见列表 · CRUD · 默认 · 归档/恢复/删除
  → model/spaceVisuals：图标色单源
  → SpaceEditorDialog：侧栏挂载，实现在本域

运行时同步（非导航真相）
  → setActiveScope：把当前 URL Scope 同步给 Rust
  → 调用方仅 ShellRouteLayout（L1）
  → URL 仍是前端 scope 真相

不负责
  → 命令打开意图队列（→ command · takePendingCommandOpenIntent）
  → URL / path 拼装（→ navigation）
  → workspace invalidate 总线（→ workspace）
  → 主壳布局（→ layout）
```

跨模块 **只** `import { … } from '@/features/space'`。
**禁止** `features/space` → `@/layout/**`。

---

## 2. 目录结构（定稿）

```txt
src/features/space/
├── ARCHITECTURE.md
├── index.ts                 # 主 public
├── api/spaces.ts            # list / CRUD / setActiveScope
├── hooks/                   # keys · queries · mutations · useSpaces
├── model/spaceVisuals.ts
└── components/
    └── SpaceEditorDialog · SpaceEditorDialog.form
```

无独立「Space 列表页」：管理入口在侧栏 Dialog + settings 默认空间。

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 数据 | `useSpaces` · `useVisibleSpacesQuery` · `spaceKeys` |
| Mutations | create / update / setDefault / archive / delete |
| IO | `listVisibleSpaces` · `deleteSpace` · `restoreSpace` · `setActiveScope` |
| 视觉 | `getSpaceVisual` · `SpaceVisualDefinition` |
| UI | `SpaceEditorDialog` |

新增导出前确认已有外消费者。导出符合 CONVENTIONS TSDoc L1。
图标色 options、内部 CRUD api、`useRestoreSpaceMutation` 默认包内（lifecycle 走 `restoreSpace` api）。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| layout | 唯一常客：`setActiveScope`、挂 Dialog、mutations |
| lifecycle | `deleteSpace` / `restoreSpace` public |
| settings | `useSetDefaultSpaceMutation` |
| task / project / view / launcher / metadata | `useSpaces` / `getSpaceVisual` |
| command | 打开意图 **不在**本域 |
| routes | `listVisibleSpaces` / `spaceKeys` ensure |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + space vitest）。
