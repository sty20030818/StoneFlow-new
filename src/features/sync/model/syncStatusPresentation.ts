import type { SyncReplicaState, SyncStatus } from '@/features/sync/api/sync'

export type SyncToneColor = 'default' | 'accent' | 'success' | 'warning' | 'danger'

export type SyncStatusTone = {
	color: SyncToneColor
	dotClassName: string
}

/** 状态圆点使用实色，避免与 badge 软底同色导致看不见 */
const syncStatusDotClassNames: Record<SyncStatus | 'default', string> = {
	synced: 'bg-success',
	offline_pending: 'bg-warning',
	syncing: 'bg-accent',
	error: 'bg-danger',
	needs_attention: 'bg-danger',
	disabled: 'bg-default',
	default: 'bg-default',
}

export function getSyncStatusTone(status: SyncStatus): SyncStatusTone {
	switch (status) {
		case 'synced':
			return {
				color: 'success',
				dotClassName: syncStatusDotClassNames.synced,
			}
		case 'offline_pending':
			return {
				color: 'warning',
				dotClassName: syncStatusDotClassNames.offline_pending,
			}
		case 'syncing':
			return {
				color: 'accent',
				dotClassName: syncStatusDotClassNames.syncing,
			}
		case 'error':
		case 'needs_attention':
			return {
				color: 'danger',
				dotClassName: syncStatusDotClassNames.error,
			}
		default:
			return {
				color: 'default',
				dotClassName: syncStatusDotClassNames.default,
			}
	}
}

export type SyncReplicaTone = {
	color: SyncToneColor
	dotClassName: string
}

export function getSyncReplicaTone(state: SyncReplicaState): SyncReplicaTone {
	const dotClassNameByState: Record<SyncReplicaState, string> = {
		ready: 'bg-success',
		baseline_required: 'bg-warning',
		diverged: 'bg-danger',
		uninitialized: 'bg-default',
	}

	return {
		color: getSyncReplicaColor(state),
		dotClassName: dotClassNameByState[state],
	}
}

function getSyncReplicaColor(state: SyncReplicaState): SyncToneColor {
	switch (state) {
		case 'ready':
			return 'success'
		case 'baseline_required':
			return 'warning'
		case 'diverged':
			return 'danger'
		default:
			return 'default'
	}
}

export function formatSyncStatus(status: SyncStatus) {
	switch (status) {
		case 'disabled':
			return '未启用'
		case 'synced':
			return '已同步'
		case 'offline_pending':
			return '待同步'
		case 'syncing':
			return '同步中'
		case 'error':
			return '同步失败'
		case 'needs_attention':
			return '需要处理'
		default:
			return status
	}
}

export function formatReplicaState(state: SyncReplicaState) {
	switch (state) {
		case 'ready':
			return '可正常同步'
		case 'baseline_required':
			return '缺少基线'
		case 'diverged':
			return '状态异常'
		case 'uninitialized':
			return '尚未初始化'
		default:
			return state
	}
}
