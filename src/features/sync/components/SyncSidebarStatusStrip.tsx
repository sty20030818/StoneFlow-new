/**
 * Sidebar 同步条：仅未配置 / 阻塞 / 错误时显示（正常已同步不占侧栏）。
 * 状态数据来自 Shell 级 SyncStatusProvider。
 */

import { RefreshCwIcon } from 'lucide-react'

import { useSharedSyncStatus } from '@/features/sync/model/SyncStatusProvider'
import {
	formatReplicaState,
	formatSyncStatus,
	getSyncStatusTone,
} from '@/features/sync/model/syncStatusPresentation'
import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/components/base/button'

export function SyncSidebarStatusStrip() {
	const { displayedStatus, loading, message, runNow, running, statusPayload } =
		useSharedSyncStatus()
	const tone = getSyncStatusTone(displayedStatus)
	const hasRemoteConfig = statusPayload?.hasRemoteConfig ?? false
	const replicaState = statusPayload?.replicaState ?? 'uninitialized'
	const blocked = replicaState === 'baseline_required' || replicaState === 'diverged'
	const attention =
		!hasRemoteConfig ||
		blocked ||
		displayedStatus === 'error' ||
		displayedStatus === 'needs_attention'

	// 正常同步：不占 sidebar，状态在 footer
	if (!attention) {
		return null
	}

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
							{!hasRemoteConfig ? '同步未配置' : formatSyncStatus(displayedStatus)}
						</span>
					</div>
					{subtitle ? (
						<p className='mt-0.5 truncate text-[11px] leading-4 text-muted-foreground'>
							{subtitle}
						</p>
					) : null}
				</div>
				{hasRemoteConfig && !blocked ? (
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
				) : null}
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
		return '请到设置中配置远端'
	}

	if (blocked) {
		return replicaLabel
	}

	return null
}
