/**
 * 应用更新 feature
 *
 * 提供应用内更新检查、下载、安装的完整功能，包括：
 * - API 层：Tauri IPC 调用封装
 * - Model 层：Zustand store、事件监听 hook
 * - UI 层：更新弹窗、设置区块
 */

export * from './api/updates'
export * from './model/useUpdateStore'
export * from './model/useUpdateEvents'
export { UpdateDialog } from './ui/UpdateDialog'
export { SystemStatusChip } from './ui/SystemStatusChip'
export { UpdateProgressRing } from './ui/UpdateProgressRing'
export { UpdateFooterChip } from './ui/UpdateFooterChip'
export { UpdateStatusFooterItem } from './ui/UpdateStatusFooterItem'
export { AppVersionFooterItem } from './ui/AppVersionFooterItem'
export { UpdateSettingsSection } from './ui/UpdateSettingsSection'
