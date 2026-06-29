import { invoke } from '@tauri-apps/api/core'

export type SyncStatus =
	| 'disabled'
	| 'synced'
	| 'syncing'
	| 'offline_pending'
	| 'error'
	| 'needs_attention'
export type SyncReplicaState = 'uninitialized' | 'ready' | 'baseline_required' | 'diverged'

export type SyncStatusPayload = {
	enabled: boolean
	status: SyncStatus
	lastPushAt: string | null
	lastPullAt: string | null
	lastError: string | null
	lastErrorMode: 'push' | 'pull' | 'sync' | null
	dirtySince: string | null
	pendingResync: boolean
	hasRemoteConfig: boolean
	remoteUrl: string | null
	replicaState: SyncReplicaState
	replicaReason: string | null
	lastRestoreAt: string | null
}

export type SyncDiagnosticsCountsPayload = {
	spaces: number
	projects: number
	tasks: number
	taskLinks: number
	views: number
	settings: number
	totalItems: number
}

export type SyncDiagnosticsPayload = {
	remoteHost: string | null
	local: {
		deviceId: string | null
		lastPulledServerSeq: number | null
		pendingMutationCount: number
		counts: SyncDiagnosticsCountsPayload
	}
	remote: {
		latestServerSeq: number | null
		counts: SyncDiagnosticsCountsPayload
	}
}

/**
 * 读取当前云同步状态。
 */
export function getSyncStatus() {
	return invoke<SyncStatusPayload>('get_sync_status')
}

/**
 * 读取当前设备与远端的同步诊断摘要。
 */
export function getSyncDiagnostics() {
	return invoke<SyncDiagnosticsPayload>('get_sync_diagnostics')
}

/**
 * 保存 Turso 远端配置。
 */
export function configureSync(input: { url: string; token: string }) {
	return invoke<SyncStatusPayload>('configure_sync', { input })
}

/**
 * 手动执行一轮完整同步。
 */
export function runSync() {
	return invoke<SyncStatusPayload>('run_sync')
}
