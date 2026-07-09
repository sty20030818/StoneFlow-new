/**
 * Footer 精简同步状态：与 sidebar strip 双写，点击可触发手动同步。
 */

import { RefreshCwIcon } from 'lucide-react'

import { useSyncStatusController } from '@/features/sync/model/useSyncStatusController'
import {
	formatReplicaState,
	formatSyncStatus,
	getSyncStatusTone,
} from '@/features/sync/model/syncStatusPresentation'
import { cn } from '@/shared/lib/utils'

export function SyncFooterStatusItem() {
	const { displayedStatus, loading, message, runNow, running, statusPayload } =
		useSyncStatusController()
	const tone = getSyncStatusTone(displayedStatus)
	const hasRemoteConfig = statusPayload?.hasRemoteConfig ?? false
	const replicaState = statusPayload?.replicaState ?? 'uninitialized'
	const blocked = replicaState === 'baseline_required' || replicaState === 'diverged'
	const disabled = loading || running || !hasRemoteConfig || blocked

	const label = !hasRemoteConfig
		? '同步·未配置'
		: blocked
			? `同步·${formatReplicaState(replicaState)}`
			: displayedStatus === 'synced'
				? '已同步'
				: formatSyncStatus(displayedStatus)

	const title = message
		? message
		: !hasRemoteConfig
			? '同步未配置远端，请到设置中配置'
			: blocked
				? formatReplicaState(replicaState)
				: formatSyncStatus(displayedStatus)

	return (
		<button
			type='button'
			title={title}
			aria-label={title}
			aria-live='polite'
			disabled={disabled && hasRemoteConfig}
			onClick={() => {
				if (!hasRemoteConfig || blocked) return
				void runNow()
			}}
			className={cn(
				'flex min-h-7 max-w-38 items-center gap-1.5 rounded-sm px-0.5',
				'text-[11px] text-sf-shell-text-tertiary transition-colors',
				'hover:text-sf-shell-text-secondary focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
				disabled && hasRemoteConfig && 'cursor-default opacity-80',
				!hasRemoteConfig && 'cursor-default',
			)}
		>
			<span
				className={cn(
					'size-1.5 shrink-0 rounded-full',
					tone.dotClassName,
					displayedStatus === 'syncing' && 'animate-pulse',
				)}
				aria-hidden
			/>
			<span className='truncate'>{label}</span>
			{running || displayedStatus === 'syncing' ? (
				<RefreshCwIcon aria-hidden className='size-3 shrink-0 animate-spin opacity-70' />
			) : null}
		</button>
	)
}
