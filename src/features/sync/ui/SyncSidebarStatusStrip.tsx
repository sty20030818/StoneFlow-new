import { RefreshCwIcon } from 'lucide-react'

import { useSyncStatusController } from '@/features/sync/model/useSyncStatusController'
import {
	formatReplicaState,
	formatSyncStatus,
	getSyncStatusTone,
} from '@/features/sync/model/syncStatusPresentation'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/base/button'

export function SyncSidebarStatusStrip() {
	const { displayedStatus, loading, message, runNow, running, statusPayload } =
		useSyncStatusController()
	const tone = getSyncStatusTone(displayedStatus)
	const hasRemoteConfig = statusPayload?.hasRemoteConfig ?? false
	const replicaState = statusPayload?.replicaState ?? 'uninitialized'
	const blocked = replicaState === 'baseline_required' || replicaState === 'diverged'
	const disabled = loading || running || !hasRemoteConfig || blocked
	const subtitle = getSidebarSyncSubtitle({
		blocked,
		hasRemoteConfig,
		message,
		replicaLabel: formatReplicaState(replicaState),
	})

	return (
		<div
			aria-live='polite'
			className='mt-2 group-data-[sidebar-mode=desktop-collapsed]/sidebar-wrapper:hidden group-data-[sidebar-mode=mobile-closed]/sidebar-wrapper:hidden'
		>
			<div
				className={cn(
					'flex items-center gap-2 rounded-md border px-2.5 py-0.5 transition-colors',
					tone.surfaceClassName,
				)}
			>
				<div className='min-w-0 flex-1'>
					<div className='flex items-center gap-2'>
						<span
							className={cn(
								'size-2 shrink-0 rounded-full',
								tone.dotClassName,
								displayedStatus === 'syncing' && 'animate-pulse',
							)}
						/>
						<span className='truncate text-xs font-semibold text-foreground'>
							{formatSyncStatus(displayedStatus)}
						</span>
					</div>
					{subtitle ? (
						<p className='mt-0.5 truncate text-[11px] leading-4 text-muted-foreground'>
							{subtitle}
						</p>
					) : null}
				</div>
				<Button
					aria-label={running ? '同步中' : '同步'}
					className='shrink-0 text-muted-foreground'
					disabled={disabled}
					onClick={() => void runNow()}
					size='icon-xs'
					type='button'
					variant='ghost'
				>
					<RefreshCwIcon className={cn(running && 'animate-spin')} />
				</Button>
			</div>
		</div>
	)
}

function getSidebarSyncSubtitle({
	blocked,
	hasRemoteConfig,
	message,
	replicaLabel,
}: {
	blocked: boolean
	hasRemoteConfig: boolean
	message: string | null
	replicaLabel: string
}) {
	if (message) {
		return message
	}

	if (!hasRemoteConfig) {
		return '未配置远端'
	}

	if (blocked) {
		return replicaLabel
	}

	return null
}
