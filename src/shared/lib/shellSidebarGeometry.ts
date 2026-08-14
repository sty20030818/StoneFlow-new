/**
 * 壳侧栏几何常量（单一真源）。
 *
 * - 设备偏好、骨架回退与 HeroUI Sidebar 共用 `DEFAULT_SIDEBAR_WIDTH`
 * - 持久化与拖拽夹紧共用 MIN/MAX
 * - 折叠态 reserved 共用 `SIDEBAR_ICON_RAIL_PX`（与 3rem 对齐，几何用 px 便于插值）
 * - `index.html` `#sf-boot-shell` 侧栏宽硬编码须与 `DEFAULT_SIDEBAR_WIDTH` 一致
 *
 * 运行时由 Shell controller 写入 HeroUI 的 `--sidebar-width`。
 */
export const DEFAULT_SIDEBAR_WIDTH = 256
export const SIDEBAR_WIDTH_MIN = 220
export const SIDEBAR_WIDTH_MAX = 330
export const SIDEBAR_ICON_RAIL_PX = 48
