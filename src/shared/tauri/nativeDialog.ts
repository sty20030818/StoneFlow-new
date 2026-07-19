/**
 * 系统原生对话框统一入口（Tauri plugin-dialog）。
 *
 * 能力：`open` / `save` 选路径；`ask` / `message` 确认与提示。
 * 业务请从此模块 import，勿散落 `@tauri-apps/plugin-dialog`。
 *
 * Rust 侧已 `tauri_plugin_dialog::init()`，capability 含 `dialog:allow-open`。
 */
export { ask, message, open, save } from '@tauri-apps/plugin-dialog'
