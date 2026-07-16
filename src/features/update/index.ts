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
export { UpdateDialog } from './components/UpdateDialog'
export { SystemStatusChip } from './components/SystemStatusChip'
export { UpdateProgressRing } from './components/UpdateProgressRing'
export { UpdateFooterChip } from './components/UpdateFooterChip'
export { UpdateStatusFooterItem } from './components/UpdateStatusFooterItem'
export { AppVersionFooterItem } from './components/AppVersionFooterItem'
export { UpdateSettingsSection } from './components/UpdateSettingsSection'
