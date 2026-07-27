/**
 * sync · 唯一对外公共面（`@/features/sync`）
 *
 * 同步状态 Provider、配置/运行 API、页脚状态 UI。
 *
 * 外模块：`import { … } from '@/features/sync'`
 * 禁止：`@/features/sync/api|model|components/…`
 */

// ── API types + IO ──────────────────────────────────────────────────────────

export type {
	SyncStatus,
	SyncCredentialState,
	SyncConfigSource,
	SyncReplicaState,
	SyncPolicyMode,
	SyncStatusPayload,
	SyncDiagnosticsPayload,
} from './api/sync'

export {
	getSyncStatus,
	getSyncDiagnostics,
	configureSync,
	updateSyncPolicy,
	runSync,
} from './api/sync'

// ── Status presentation ─────────────────────────────────────────────────────

export {
	getSyncStatusTone,
	getSyncReplicaTone,
	formatSyncStatus,
	formatReplicaState,
} from './model/syncStatusPresentation'

// ── Provider ────────────────────────────────────────────────────────────────

/** 壳级同步状态共享（layout 挂载）。 */
export { SyncStatusProvider, useSharedSyncStatus } from './model/SyncStatusProvider'

// ── UI ──────────────────────────────────────────────────────────────────────

export { SyncFooterStatusItem } from './components/SyncFooterStatusItem'
export { SyncConfigDialog } from './components/SyncConfigDialog'

/** 原生选路径 / 确认框（plugin-dialog）；同步目录等场景从此取 */
export { ask, message, open, save } from '@/shared/tauri/nativeDialog'
