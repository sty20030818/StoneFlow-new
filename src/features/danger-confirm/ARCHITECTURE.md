# danger-confirm · 危险操作确认

> 作用：描述 **当前已落地** 的 `src/features/danger-confirm` 边界  
> 最后更新：2026-07-18

---

## 1. 职责 / 不负责

**负责：**

- 危险操作确认文案与请求类型（归档 / 回收站 / 永久删除）
- 全局 `DangerConfirmProvider` + `useDangerConfirm().requestDangerConfirm`
- 确认对话框 UI（`DangerConfirmDialog`）

**不负责：**

- 实际 archive / trash / delete mutation（→ 各业务域 adapter）
- bulk 引擎编排（→ `@/features/bulk-action`，仅调用本 hook）
- 命令注册与快捷键（→ `@/features/command`）

---

## 2. 目录（简树）

```txt
src/features/danger-confirm/
├── ARCHITECTURE.md
├── index.ts
├── model/dangerConfirm.ts       # 纯文案与类型
├── runtime/DangerConfirmProvider.tsx
└── components/DangerConfirmDialog.tsx
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| 类型 | `DangerConfirmIntent` · `DangerConfirmEntityType` · `DangerConfirmRequest` · `DangerConfirmCopy` |
| 文案 | `buildDangerConfirmCopy` |
| Runtime | `DangerConfirmProvider` · `useDangerConfirm` |
| UI | `DangerConfirmDialog`（通常 Provider 内挂载；测试可直接用） |

`requestDangerConfirm` 返回 `Promise<boolean>`。

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import（`runtime/`、`model/`、`components/`）
- 本域 **不** 调用各域 mutation；只负责确认交互
- 跨 feature 消费方只通过 `useDangerConfirm()`，不复制对话框

---

## 5. 装配点

| 位置 | 挂载 |
|------|------|
| `layout/ShellProviders.tsx` | 根级 `DangerConfirmProvider` |
| `task` / `project` / `lifecycle` | 行菜单、详情、bulk 前 `requestDangerConfirm` |
| `bulk-action` `BulkActionProvider` | 批量危险动作确认 |

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| 待确认请求 | **UI** Provider 内 `pendingConfirm` |
| Promise 决议 | **UI** `resolverRef`（确认/取消一次性） |
| 业务数据 | **无**（确认后不保留实体状态） |
