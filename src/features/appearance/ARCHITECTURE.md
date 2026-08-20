# appearance · 本机外观偏好

`appearance` 是 Main、Launcher 与 Settings 共用的轻量平台能力：只保存并应用当前设备的 Accent 预设标识。

- `theme.css` 独占颜色值；本模块只拥有稳定 ID、中文名称、合法值校验与根 `data-accent`。
- Main 与 Launcher 在 React 挂载前调用 `bootstrapAppearance()`。
- Launcher 每次 `session-prepared` 时重新读取并应用偏好，再进入呈现流程。
- 偏好复用 renderer 的 Web Storage 合同；不进入 Rust、SQLite、账户或同步，也不新增跨窗口通道。
