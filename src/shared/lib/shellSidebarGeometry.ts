/**
 * 壳侧栏几何常量（单一真源）。
 *
 * - 设备偏好默认 / 骨架回退 / SidebarProvider 默认 共用 `DEFAULT_SIDEBAR_WIDTH`
 * - 持久化与拖拽夹紧共用 MIN/MAX
 * - 折叠态 reserved 共用 `SIDEBAR_ICON_RAIL_PX`（与 3rem 对齐，几何用 px 便于插值）
 *
 * 运行时展开宽仍以 SidebarProvider 写入的 `--sf-shell-sidebar-reserved-width` 为准。
 */
export const DEFAULT_SIDEBAR_WIDTH = 256
export const SIDEBAR_WIDTH_MIN = 220
export const SIDEBAR_WIDTH_MAX = 330
export const SIDEBAR_ICON_RAIL_PX = 48
