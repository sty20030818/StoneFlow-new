/**
 * 系统状态 Chip 队列（底部非模态）。
 *
 * 优先级（设计方案）：更新就绪 > 同步错误/需处理 > 其它。
 * 同一时间只展示最高优先级一条，避免多 pill 叠放。
 */

import { RefreshCwIcon } from 'lucide-react'

import { useSharedSyncStatus } from '@/features/sync'
import { formatReplicaState, formatSyncStatus } from '@/features/sync'
import { useUpdateInstallActions } from '../hooks/useUpdateInstallActions'
import { selectReadyChipVisible, useUpdateStore } from '../model/useUpdateStore'
import { Button } from '@/shared/components/base/button'
import { cn } from '@/shared/lib/utils'

type ChipKind = 'update-ready' | 'sync-attention'

function resolveActiveChip(input: {
	updateReady: boolean
	syncAttention: boolean
}): ChipKind | null {
	if (input.updateReady) return 'update-ready'
	if (input.syncAttention) return 'sync-attention'
	return null
}

/** 纯函数：chip 优先级（单测） */
export { resolveActiveChip }

export function SystemStatusChip() {
	const updateReady = useUpdateStore(selectReadyChipVisible)
	const updateInfo = useUpdateStore((s) => s.updateInfo)
	const dismissReadyChip = useUpdateStore((s) => s.dismissReadyChip)
	const { restart } = useUpdateInstallActions()

	const { displayedStatus, message, runNow, running, statusPayload } = useSharedSyncStatus()

	const replicaState = statusPayload?.replicaState ?? 'uninitialized'
	const blocked = replicaState === 'baseline_required' || replicaState === 'diverged'
	const syncAttention =
		displayedStatus === 'error' || displayedStatus === 'needs_attention' || blocked

	const active = resolveActiveChip({ updateReady, syncAttention })
	if (!active) return null

	const shellClass = cn(
		'pointer-events-none fixed inset-x-0 bottom-10 z-40 flex justify-center px-3',
	)
	const pillClass = cn(
		'pointer-events-auto flex max-w-md items-center gap-3 rounded-full',
		'border border-border bg-background/95 px-3 py-1.5 shadow-(--sf-shadow-float)',
		'backdrop-blur-sm supports-backdrop-filter:bg-background/85',
		'animate-in fade-in-0 slide-in-from-bottom-1 duration-200',
	)

	if (active === 'update-ready') {
		const version = updateInfo?.version ?? ''
		return (
			<div role='status' aria-live='polite' className={shellClass}>
				<div className={pillClass}>
					<span className='size-2 shrink-0 rounded-full bg-emerald-500' aria-hidden />
					<p className='min-w-0 truncate text-[13px] font-medium text-foreground'>
						{version ? `v${version} 已就绪` : '更新已就绪'}
					</p>
					<div className='flex shrink-0 items-center gap-1'>
						<Button
							type='button'
							size='sm'
							variant='ghost'
							className='h-7 rounded-full px-2.5 text-[12px]'
							onClick={dismissReadyChip}
						>
							稍后
						</Button>
						<Button
							type='button'
							size='sm'
							className='h-7 rounded-full px-2.5 text-[12px] active:scale-[0.96]'
							onClick={() => void restart()}
						>
							<RefreshCwIcon aria-hidden className='-ml-0.5 mr-1 size-3.5' />
							重启
						</Button>
					</div>
				</div>
			</div>
		)
	}

	// sync-attention
	const syncLabel = blocked
		? formatReplicaState(replicaState)
		: message
			? message
			: formatSyncStatus(displayedStatus)

	return (
		<div role='status' aria-live='polite' className={shellClass}>
			<div className={pillClass}>
				<span className='size-2 shrink-0 rounded-full bg-red-500' aria-hidden />
				<p className='min-w-0 truncate text-[13px] font-medium text-foreground'>
					同步：{syncLabel}
				</p>
				<div className='flex shrink-0 items-center gap-1'>
					<Button
						type='button'
						size='sm'
						variant='ghost'
						className='h-7 rounded-full px-2.5 text-[12px]'
						disabled={running || blocked}
						onClick={() => void runNow()}
					>
						{running ? '同步中…' : '重试'}
					</Button>
				</div>
			</div>
		</div>
	)
}
