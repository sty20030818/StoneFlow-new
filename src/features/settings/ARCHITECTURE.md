# settings · 设置

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-08-20

---

## 1. 心智

```txt
三入口（冻结）
  @/features/settings          → 壳用：store / 侧栏类型 / SettingsSidebar；再导出 contract
  @/features/settings/contract → 分区 key + 上次分区记忆（navigation 安全，无 React Page）
  @/features/settings/page     → 仅 routes 挂 SettingsPage

页
  SettingsPage（薄壳）→ panels：General / Sidebar / Sync / Update
  Sync / Update 只装配 sync / update public；General 主题色走 appearance public、默认空间走 space public

偏好
  sidebarSettings（可同步可见性）+ shellDevicePreferences（本机宽/折叠等）
  → useSidebarSettingsStore 合并为 ShellSidebarSettings
```

**禁止** `features/settings` → `@/layout/**`。
**禁止** navigation / 壳深路径进 api|model|components。

Settings 页面与 panels 直接组合 HeroUI Form、Card 与标准控件；`settingsShared` 只负责设置分区的产品结构，不是视觉 wrapper。Sync / Update 的系统状态和动作只消费各自 public，不复制其状态机或反馈实现。

---

## 2. 目录结构（定稿）

```txt
src/features/settings/
├── ARCHITECTURE.md
├── index.ts · contract.ts · page.ts   # 三入口
├── api/                               # sidebarSettings · shellDevicePreferences
├── model/                             # section · lastSection · nav · store
└── components/
    ├── SettingsPage · SettingsSidebar · settingsShared
    └── panels/                        # General · Sidebar · Sync(+presentation) · Update
```

---

## 3. Public 要点

| 入口 | 宜导出 |
|------|--------|
| 主入口 | store + selectors · `SettingsSidebar` · 壳用侧栏类型 · contract 再导出 |
| contract | section key / 记忆读写 |
| page | `SettingsPage` |

原始 IO（get/update sidebar、load device…）默认包内，经 store 暴露给壳。
`SETTINGS_NAV_GROUPS` 包内供 SettingsSidebar。

---

## 4. 与其它模块

| 协作 | 方向 |
|------|------|
| layout | 主入口：store、SettingsSidebar、类型 |
| navigation / routes | contract；routes 另挂 page |
| appearance / sync / update / space | panels 只装配其 public |
| layout | **禁**本域依赖 |

---

## 5. 变更纪律

改定稿目录或 public 时更新本文件。`bun run check`（或至少 tsc + boundaries + settings vitest）。
