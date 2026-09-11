# app-info · 应用元信息

> 作用：运行时版本、关于窗口与公开资料链接的唯一归属。

## 职责 / 不负责

**负责：** Tauri 版本读取、页脚版本展示、关于 Dialog、公开链接集中配置。

**不负责：** 更新检查/下载/安装（→ `@/features/update`）、更新日志内容（→ `@/features/changelog`）、Dialog 开关状态（→ `layout/overlays`）。

## Public

- `AboutDialogHost`（首次打开后 lazy mount `AboutDialog`）
- `AppVersionFooterItem`

外模块只从 `@/features/app-info` 导入；不得深路径访问配置或 Tauri API。

## 关于窗口

- 使用居中的紧凑 HeroUI Modal，沿用主题字体、表面和圆角；展示应用图标、名称、简短说明及运行中版本。
- 身份信息共用 Header 中轴；更新日志（ghost）与检查更新（outline）作为纯文字按钮收拢在原生 Footer，窄宽度时允许换行，不再分成两列。
- 更新日志由上层 callback 打开；检查更新复用 `update` 的手动检查入口，不在本模块建立第二套更新状态。
- 仅展示已配置的 HTTPS 资料入口；未配置或无效地址直接隐藏，全部不可用时不渲染「资料与支持」区及分隔线。
- 保留 Modal 原生键盘焦点、Escape 关闭和关闭后的焦点恢复。

## 装配点

| 位置 | 挂载 |
|---|---|
| `layout/ShellFooter.tsx` | `AppVersionFooterItem` |
| `layout/overlays/ShellOverlays.tsx` | `AboutDialogHost` |
