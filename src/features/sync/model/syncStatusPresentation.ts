import type { BadgeVariant } from '@/shared/components/base/badge'

import type { SyncReplicaState, SyncStatus } from '@/features/sync/api/sync'

export type SyncStatusTone = {
	badgeVariant: BadgeVariant
	dotClassName: string
	surfaceClassName: string
}

/** 状态圆点使用实色，避免与 badge 软底同色导致看不见 */
const syncStatusDotClassNames: Record<SyncStatus | 'default', string> = {
	synced: 'bg-[var(--sf-success-strong)]',
	offline_pending: 'bg-[var(--sf-warning-strong)]',
	syncing: 'bg-[var(--sf-accent-primary)]',
	error: 'bg-[var(--sf-danger-strong)]',
	needs_attention: 'bg-[var(--sf-danger-strong)]',
	disabled: 'bg-[var(--sf-neutral-700)]',
	default: 'bg-[var(--sf-neutral-700)]',
}

export function getSyncStatusTone(status: SyncStatus): SyncStatusTone {
	switch (status) {
		case 'synced':
			return {
				badgeVariant: 'success',
				dotClassName: syncStatusDotClassNames.synced,
				surfaceClassName: 'border-sf-success-surface-border bg-sf-success-surface',
			}
		case 'offline_pending':
			return {
				badgeVariant: 'warning',
				dotClassName: syncStatusDotClassNames.offline_pending,
				surfaceClassName: 'border-sf-warning-surface-border bg-sf-warning-surface',
			}
		case 'syncing':
			return {
				badgeVariant: 'primary',
				dotClassName: syncStatusDotClassNames.syncing,
				surfaceClassName: 'border-sf-accent-soft-border bg-legacy-accent',
			}
		case 'error':
		case 'needs_attention':
			return {
				badgeVariant: 'destructive',
				dotClassName: syncStatusDotClassNames.error,
				surfaceClassName: 'border-sf-danger-surface-border bg-sf-danger-surface',
			}
		default:
			return {
				badgeVariant: 'outline',
				dotClassName: syncStatusDotClassNames.default,
				surfaceClassName: 'border-sf-border-subtle bg-legacy-muted/35',
			}
	}
}

export type SyncReplicaTone = {
	badgeVariant: BadgeVariant
	dotClassName: string
}

export function getSyncReplicaTone(state: SyncReplicaState): SyncReplicaTone {
	const dotClassNameByState: Record<SyncReplicaState, string> = {
		ready: 'bg-[var(--sf-success-strong)]',
		baseline_required: 'bg-[var(--sf-warning-strong)]',
		diverged: 'bg-[var(--sf-danger-strong)]',
		uninitialized: 'bg-[var(--sf-neutral-500)]',
	}

	return {
		badgeVariant: getSyncReplicaBadgeVariant(state),
		dotClassName: dotClassNameByState[state] ?? 'bg-[var(--sf-neutral-500)]',
	}
}

export function getSyncReplicaBadgeVariant(state: SyncReplicaState): BadgeVariant {
	switch (state) {
		case 'ready':
			return 'success'
		case 'baseline_required':
			return 'warning'
		case 'diverged':
			return 'destructive'
		default:
			return 'outline'
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
