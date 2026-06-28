import { invoke } from '@tauri-apps/api/core'

export type SyncStatus = 'disabled' | 'idle' | 'dirty' | 'pushing' | 'pulling' | 'error'
export type SyncReplicaState = 'uninitialized' | 'ready' | 'restore_required' | 'diverged'

export type SyncStatusPayload = {
	enabled: boolean
	status: SyncStatus
	lastPushAt: string | null
	lastPullAt: string | null
	lastError: string | null
	lastErrorMode: 'push' | 'pull' | 'force' | 'restore' | null
	dirtySince: string | null
	pendingResync: boolean
	hasRemoteConfig: boolean
	remoteUrl: string | null
	replicaState: SyncReplicaState
	replicaReason: string | null
	lastRestoreAt: string | null
}

export type RestoreSyncPayload = {
	status: SyncStatusPayload
	summary: {
		spaces: number
		projects: number
		tasks: number
		taskLinks: number
		views: number
		settings: number
		totalItems: number
	}
}

/**
 * 读取当前云同步状态。
 */
export function getSyncStatus() {
	return invoke<SyncStatusPayload>('get_sync_status')
}

/**
 * 保存 Turso 远端配置。
 */
export function configureSync(input: { url: string; token: string }) {
	return invoke<SyncStatusPayload>('configure_sync', { input })
}

/**
 * 手动执行一轮 push -> pull。
 */
export function forceSync() {
	return invoke<SyncStatusPayload>('force_sync')
}

/**
 * 用远端镜像重建当前设备的本地副本。
 */
export function restoreSync() {
	return invoke<RestoreSyncPayload>('restore_sync')
}
