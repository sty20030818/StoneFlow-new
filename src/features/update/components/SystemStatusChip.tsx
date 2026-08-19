import { Alert, Button } from '@heroui/react'
import { useSharedSyncStatus } from '@/features/sync'
import { formatReplicaState, formatSyncStatus } from '@/features/sync'
import {
	selectReadyChipVisible,
	selectUpdateSnapshot,
	useUpdateStore,
} from '../model/useUpdateStore'

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
	const snapshot = useUpdateStore(selectUpdateSnapshot)
	const dismissReadyChip = useUpdateStore((s) => s.dismissReadyChip)
	const openDialog = useUpdateStore((s) => s.openDialog)

	const { displayedStatus, message, runNow, running, statusPayload } = useSharedSyncStatus()

	const replicaState = statusPayload?.replicaState ?? 'uninitialized'
	const blocked = replicaState === 'baseline_required' || replicaState === 'diverged'
	const syncAttention =
		displayedStatus === 'error' || displayedStatus === 'needs_attention' || blocked

	const active = resolveActiveChip({ updateReady, syncAttention })
	if (!active) return null

	const shellClass = 'pointer-events-none fixed inset-x-0 bottom-10 z-40 flex justify-center px-3'

	if (active === 'update-ready') {
		const version = snapshot.update?.version ?? ''
		const installFailed = Boolean(snapshot.errorMessage)
		return (
			<div className={shellClass}>
				<Alert
					aria-live='polite'
					className='pointer-events-auto max-w-md'
					role='status'
					status={installFailed ? 'danger' : 'success'}
				>
					<Alert.Indicator />
					<Alert.Content>
						<Alert.Title>
							{installFailed
								? version
									? `v${version} 安装失败`
									: '安装失败'
								: version
									? `v${version} 已就绪`
									: '更新已就绪'}
						</Alert.Title>
					</Alert.Content>
					<div className='flex shrink-0 items-center gap-1'>
						<Button onPress={dismissReadyChip} size='sm' type='button' variant='ghost'>
							稍后
						</Button>
						<Button onPress={openDialog} size='sm' type='button'>
							查看
						</Button>
					</div>
				</Alert>
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
		<div className={shellClass}>
			<Alert
				aria-live='polite'
				className='pointer-events-auto max-w-md'
				role='status'
				status='danger'
			>
				<Alert.Indicator />
				<Alert.Content>
					<Alert.Title>同步：{syncLabel}</Alert.Title>
				</Alert.Content>
				<div className='flex shrink-0 items-center gap-1'>
					<Button
						isDisabled={running || blocked}
						onPress={() => void runNow()}
						size='sm'
						type='button'
						variant='ghost'
					>
						{running ? '同步中…' : '重试'}
					</Button>
				</div>
			</Alert>
		</div>
	)
}
