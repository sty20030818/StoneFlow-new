/**
 * @fileoverview **update · 唯一对外公共面（`@/features/update`）**
 *
 * 应用内更新检查/下载/安装、状态芯片与设置区块。
 *
 * 外模块：`import { … } from '@/features/update'`
 * 禁止：`@/features/update/api|model|components/…`
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
