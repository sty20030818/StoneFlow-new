/**
 * @fileoverview **update · 主入口（`@/features/update`）**
 *
 * 显式 export 清单（禁止 `export *`）。
 */

// ── api ─────────────────────────────────────────────────────────────────────

export type {
	UpdateChannel,
	UpdateCheckMode,
	UpdateInfo,
	UpdateSettings,
	CheckIntervalSecs,
	UpdatePhasePayload,
	UpdateSessionPhase,
	UpdateSessionSnapshot,
} from './api/updates'

export {
	ALLOWED_CHECK_INTERVAL_SECS,
	UPDATE_EVENTS,
	checkUpdate,
	downloadAndInstall,
	restartAndInstall,
	skipVersion,
	setCheckMode,
	setChannel,
	setCheckIntervalSecs,
	getUpdateSettings,
	getUpdateSession,
	cancelUpdateDownload,
} from './api/updates'

// ── model ───────────────────────────────────────────────────────────────────

export type { UpdateUiPhase, UpdateProgress } from './model/useUpdateStore'
export {
	useUpdateStore,
	selectReadyChipVisible,
	selectFooterUpdateVisible,
} from './model/useUpdateStore'

export { useUpdateEvents, useUpdateActions } from './model/useUpdateEvents'

// ── UI ──────────────────────────────────────────────────────────────────────

export { UpdateDialog } from './components/UpdateDialog'
export { SystemStatusChip } from './components/SystemStatusChip'
export { UpdateProgressRing } from './components/UpdateProgressRing'
export { UpdateFooterChip } from './components/UpdateFooterChip'
export { UpdateStatusFooterItem } from './components/UpdateStatusFooterItem'
export { AppVersionFooterItem } from './components/AppVersionFooterItem'
export { UpdateSettingsSection } from './components/UpdateSettingsSection'
