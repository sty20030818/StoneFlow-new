# app-info · 应用元信息

> 作用：运行时版本、关于窗口与公开资料链接的唯一归属。

## 职责 / 不负责

**负责：** Tauri 版本读取、页脚版本展示、关于 Dialog、公开链接集中配置。

**不负责：** 更新检查/下载/安装（→ `@/features/update`）、更新日志内容（→ `@/features/changelog`）、Dialog 开关状态（→ `layout/overlays`）。

## Public

- `AboutDialog`
- `AppVersionFooterItem`

外模块只从 `@/features/app-info` 导入；不得深路径访问配置或 Tauri API。

## 装配点

| 位置 | 挂载 |
|---|---|
| `layout/ShellFooter.tsx` | `AppVersionFooterItem` |
| `layout/overlays/ShellOverlays.tsx` | `AboutDialog` |
