# lifecycle · 归档 / 回收站编排

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-07-19

---

## 1. 心智

```txt
routes 薄页
  → LifecycleList（薄壳）
  → useLifecycleScene(mode)（选择 / bulk / 打开详情）
  → PageFrame + LifecycleBoard

写路径
  → api 按 entityType 委托 task / project / space **public**
  → 本域不复制实体业务规则

批量 / 命令
  → bulk/（动作定义 + adapter）
  → commands/registerLifecycleCommands
```

跨模块 **只** `import { … } from '@/features/lifecycle'`。
**禁止** `features/lifecycle` → `@/layout/**`。
**禁止** 吞进 task/project（Keep 独立编排域）。

---

## 2. 目录结构（定稿）

```txt
src/features/lifecycle/
├── ARCHITECTURE.md
├── index.ts                 # 主 public
├── api/                     # list + 编排型 delete/restore/permanent
├── hooks/                   # keys · queries · mutations · useLifecycleScene
├── model/                   # command selection · sections 纯函数
├── bulk/                    # 批量动作 + adapter
├── commands/                # registerLifecycleCommands
└── components/
    ├── LifecycleList        # 页薄壳（槽位拼装）
    ├── LifecycleBoard · LifecycleRowAdapter · LifecycleContextMenu
```

列表编排在 `hooks/useLifecycleScene`；`LifecycleList` 只组合页面框架与生命周期 Board。

---

## 3. Public 要点

| 类 | 示例 |
|----|------|
| 页面 / UI | `LifecycleList` · `LifecycleBoard` |
| 数据 | `useLifecycleEntriesQuery` |
| IO | `listLifecycleEntries`（徽章 / Boundary 等外消费者） |
| 批量 | `lifecycleBulkActions` · `createLifecycleBulkAdapter` |
| 命令 | `registerLifecycleCommands` |

新增导出前确认已有外消费者。导出符合 CONVENTIONS TSDoc L1。
写操作 api/mutations、command selection 默认包内使用，不预防性外放。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| task / project / space | 写路径只调其 public；本域只编排 |
| bulk-action | 引擎在 bulk-action；本域贡献 actions/adapter |
| command | 经 `registerLifecycleCommands` 注入 handlers |
| page-frame | 页面组合纯框架；Board 归本域 |
| layout | badges 用 `useLifecycleEntriesQuery`；**禁**本域 → layout |
| routes | 极薄：只挂 `LifecycleList mode` |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + lifecycle vitest）。
