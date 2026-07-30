/**
 * update · 主入口（`@/features/update`）
 *
 * 外仓装配面：壳事件 / Dialog·Chip / 页脚 / 设置区块。
 * 包内 API、store、派生 UI 不对外导出。
 */

export { useManualUpdateCheck } from './hooks/useManualUpdateCheck'
export { useUpdateEvents } from './hooks/useUpdateEvents'
export { UpdateDialog } from './components/UpdateDialog'
export { SystemStatusChip } from './components/SystemStatusChip'
export { UpdateStatusFooterItem } from './components/UpdateStatusFooterItem'
export { UpdateSettingsSection } from './components/UpdateSettingsSection'
