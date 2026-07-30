# update · 应用更新

> 作用：描述 **当前已落地** 的 `src/features/update` 边界
> 最后更新：2026-07-29

---

## 1. 职责 / 不负责

**负责：**

- 检查 / 下载 / 安装 / 重启 / 跳过版本 API（Tauri invoke + 事件）
- 更新 UI 相位单轨（Zustand `useUpdateStore`）
- 事件监听、主动检查与安装动作（`useUpdateEvents` · `useManualUpdateCheck` · 内部安装 Hook）
- 更新对话框、页脚 chip、系统状态 chip、设置面板

**不负责：**

- 数据同步配置与状态（→ `@/features/sync`；chip 可只读展示 sync）
- 壳 Overlays 开关编排（→ `layout/overlays`）
- 用户 changelog 内容读取、解析与筛选（→ `@/features/changelog`）

---

## 2. 目录（简树）

```txt
src/features/update/
├── ARCHITECTURE.md
├── index.ts
├── contract.ts
├── api/updates.ts
├── hooks/
│   ├── useManualUpdateCheck.ts
│   ├── useUpdateInstallActions.ts
│   ├── useUpdateEvents.ts
│   └── updatePhaseEffects.ts
├── model/
│   └── useUpdateStore.ts
│   ├── applyUpdatePhase.ts
│   ├── updatePresentation.ts
│   └── deriveUpdateFooterView.ts
└── components/
    ├── UpdateDialog.tsx
    ├── SystemStatusChip.tsx
    ├── UpdateFooterChip.tsx
    ├── UpdateStatusFooterItem.tsx
    ├── UpdateProgressRing.tsx
    ├── UpdateSettingsSection.tsx
    └── UpdateSettingsSection.presentation.tsx
```

---

## 3. Public 最小集（要点）

| 类 | 符号 |
|----|------|
| 事件 / 主动检查 | `useUpdateEvents` · `useManualUpdateCheck` |
| UI | `UpdateDialog` · `SystemStatusChip` · `UpdateStatusFooterItem` · `UpdateSettingsSection` |
| 跨 feature 读取 | `contract.ts` 的 `getUpdateSettings` · `UpdateChannel` |

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
| `layout/ShellLayoutContent.tsx` | `useUpdateEvents()`，消费一次性更新完成确认并发出 changelog 打开意图 |
| `layout/overlays/ShellOverlays.tsx` | `UpdateDialog` · `SystemStatusChip`；更新记录弹窗由 changelog 模块装配 |
| `layout/ShellFooter.tsx` | `UpdateStatusFooterItem` （版本号属 `@/features/app-info`） |
| `features/settings` 页（update 分区） | 直接挂 `UpdateSettingsSection` |

头像菜单、设置页和关于窗口只能调 `useManualUpdateCheck`，不得直接 `invoke('check_update')`或复制 `checking` 状态。

`UpdateDialog` 壳层复用 `createDialogCompactShellClass`（create-dialog 同族）；ready/error 用 `StatusNotice`。目标版本说明只读取 changelog 模块，updater manifest 不承载用户内容。

---

## 6. 状态落点（URL | Query | UI）

| 状态 | 落点 |
|------|------|
| UI 相位 / 进度 / 对话框 | **UI** Zustand `useUpdateStore` |
| 用户设置（频道、间隔等） | **Tauri** 经 `api/updates` 读写 |
| 后端 session | **Tauri** `getUpdateSession` + `UPDATE_EVENTS` 推送 |
| 页脚展示 | **派生** `deriveUpdateFooterView` |
