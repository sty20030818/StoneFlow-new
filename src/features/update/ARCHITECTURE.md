# update · 应用更新

> 作用：描述 **当前已落地** 的 `src/features/update` 边界
> 最后更新：2026-07-19

---

## 1. 职责 / 不负责

**负责：**

- 检查 / 下载 / 安装 / 重启 / 跳过版本 API（Tauri invoke + 事件）
- 更新 UI 相位单轨（Zustand `useUpdateStore`）
- 事件监听与动作封装（`useUpdateEvents` · `useUpdateActions`）
- 更新对话框、页脚 chip、系统状态 chip、设置面板

**不负责：**

- 数据同步配置与状态（→ `@/features/sync`；chip 可只读展示 sync）
- 壳 Overlays 开关编排（→ `layout/overlays`）
- 后端 updater 实现细节

---

## 2. 目录（简树）

```txt
src/features/update/
├── ARCHITECTURE.md
├── index.ts
├── api/updates.ts
├── model/
│   ├── useUpdateStore.ts
│   ├── useUpdateEvents.ts
│   ├── applyUpdatePhase.ts
│   ├── updatePresentation.ts
│   └── deriveUpdateFooterView.ts
└── components/
    ├── UpdateDialog.tsx
    ├── UpdateDialog.presentation.tsx
    ├── SystemStatusChip.tsx
    ├── UpdateFooterChip.tsx
    ├── UpdateStatusFooterItem.tsx
    ├── AppVersionFooterItem.tsx
    ├── UpdateProgressRing.tsx
    ├── UpdateSettingsSection.tsx
    └── UpdateSettingsSection.presentation.tsx
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| 事件 | `useUpdateEvents` |
| UI | `UpdateDialog` · `SystemStatusChip` · `UpdateStatusFooterItem` · `AppVersionFooterItem` · `UpdateSettingsSection` |

显式 export 清单，禁止 `export *`。API / store / 内部 chip 组件留包内。

---

## 4. 禁止依赖

- **不得** `import` `@/layout/**`
- **不得** 外模块深路径 import
- 可读 `@/features/sync` public（`SystemStatusChip` 组合展示）
- 不在本域操作 workspace Query 或业务 mutation

---

## 5. 装配点

| 位置 | 挂载 |
|------|------|
| `layout/ShellLayoutContent.tsx` | `useUpdateEvents()` |
| `layout/overlays/ShellOverlays.tsx` | `UpdateDialog` · `SystemStatusChip` |
| `layout/ShellFooter.tsx` | `UpdateStatusFooterItem` · `AppVersionFooterItem` |
| `features/settings` 页（update 分区） | 直接挂 `UpdateSettingsSection` |

`UpdateDialog` 壳层复用 `createDialogCompactShellClass`（create-dialog 同族）；ready/error 用 `StatusNotice`；changelog 在 `.presentation`。

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| UI 相位 / 进度 / 对话框 | **UI** Zustand `useUpdateStore` |
| 用户设置（频道、间隔等） | **Tauri** 经 `api/updates` 读写 |
| 后端 session | **Tauri** `getUpdateSession` + `UPDATE_EVENTS` 推送 |
| 页脚展示 | **派生** `deriveUpdateFooterView` |
