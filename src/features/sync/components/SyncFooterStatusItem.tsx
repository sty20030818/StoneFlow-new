/**
 * Footer 左侧同步 · 方案 A
 * 容器：接状态 → view model → 拼装零件（灯 / 文案 / 按钮分离）。
 */

import { Button, Spinner } from '@heroui/react'
import { RefreshCwIcon } from 'lucide-react'

import { deriveSyncFooterView } from '@/features/sync/model/deriveSyncFooterView'
import { useSharedSyncStatus } from '@/features/sync/model/SyncStatusProvider'
import { cn } from '@/shared/lib/utils'

export function SyncFooterStatusItem() {
	const { displayedStatus, loading, message, runNow, running, statusPayload } =
		useSharedSyncStatus()

	const view = deriveSyncFooterView({
		displayedStatus,
		loading,
		running,
		message,
		statusPayload: statusPayload
			? {
					credentialState: statusPayload.credentialState,
					hasRemoteConfig: statusPayload.hasRemoteConfig,
					replicaState: statusPayload.replicaState,
				}
			: null,
	})
	return (
		<div
			aria-label={view.title}
			aria-live='polite'
			className='flex min-w-0 items-center gap-1.5'
			role='status'
			title={view.title}
		>
			{view.busy ? (
				<Spinner aria-hidden='true' color='current' size='sm' />
			) : (
				<span aria-hidden className={cn('size-2 shrink-0 rounded-full', view.tone.dotClassName)} />
			)}
			<span className='max-w-28 truncate text-xs text-muted'>{view.label}</span>
			<Button
				aria-label={view.actionLabel}
				className='size-6 min-w-6'
				isDisabled={view.actionDisabled}
				isIconOnly
				onPress={() => void runNow()}
				size='sm'
				type='button'
				variant='ghost'
			>
				<RefreshCwIcon aria-hidden className='size-3' />
			</Button>
		</div>
	)
}
