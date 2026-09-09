# settings · 设置

> 定稿最优架构。写法见 [`CONVENTIONS.md`](../../CONVENTIONS.md)。最后更新：2026-09-09

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

Settings 页面与 panels 直接组合 HeroUI Form、Card 与标准控件；`settingsShared` 只负责设置分区的产品结构，不是视觉 wrapper。八个 Sidebar 开关通过 `SettingsToggleRow` 复用同一产品接口，内部直接组合 Pro `CellSwitch`；默认 Space 只有一个消费者，在 General panel 内直接组合 Pro `CellSelect`。同步间隔使用 OSS `NumberField`。这些组合保持受控，由现有 mutation 与 canonical 返回值拥有业务真相，不复制 HeroUI 状态机或保留 OSS fallback。Sync / Update 的系统状态和动作只消费各自 public，不复制其状态机或反馈实现。

`SettingsSection` 只提供标题、说明与可访问分区，不强制包 Card；相关设置组按需使用单层白色 Card，默认空间这样的单个下拉控件直接放在分区内，不另包 Card。主题色、同步方式和更新选项直接采用 Pro `RadioButtonGroup` 整卡选择；侧边栏仍是独立开关，不把多选伪装成单选卡。同步概览的指标与折叠诊断使用语义化数据行，不再嵌套 Surface 或指标 Card。

Sidebar 开关保存期间按组进入 `isReadOnly` / `aria-busy`，保留文字亮度、键盘焦点和已确认值，由原生只读交互阻止重复写入；保存完成后解除，失败时保留原值并显示错误。`isDisabled` 只用于最后一个导航入口不能关闭等业务不可用状态，不再把短暂保存映射为整组灰显。

首次同步状态读取失败显式报错并提供重试，不将未知状态显示为未配置；当前操作错误不藏在折叠诊断里。待同步数量只有读取诊断后才展示，未读取时不冒充零，读取后明确标为诊断快照，而不是实时计数。

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
