/**
 * Footer 左侧同步 · 方案 A
 * 容器：接状态 → view model → 拼装零件（灯 / 文案 / 按钮分离）。
 */

import { RefreshCwIcon } from 'lucide-react'

import { deriveSyncFooterView } from '@/features/sync/model/deriveSyncFooterView'
import { useSharedSyncStatus } from '@/features/sync/model/SyncStatusProvider'
import { ShellFooterStatus } from '@/shared/components/patterns/ShellFooterStatus'
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
	const disabledReason =
		view.actionDisabled && view.actionLabel !== view.title ? view.title : undefined

	return (
		<ShellFooterStatus.Root role='status' aria-live='polite' aria-label={view.title}>
			<ShellFooterStatus.Dot className={view.tone.dotClassName} busy={view.busy} />
			<ShellFooterStatus.StaticLabel overflowContent={view.title}>
				{view.label}
			</ShellFooterStatus.StaticLabel>
			<ShellFooterStatus.IconButton
				disabled={view.actionDisabled}
				disabledReason={disabledReason}
				aria-label={view.actionLabel}
				onClick={() => {
					if (view.actionDisabled) return
					void runNow()
				}}
			>
				<RefreshCwIcon aria-hidden className={cn('size-3', view.busy && 'animate-spin')} />
			</ShellFooterStatus.IconButton>
		</ShellFooterStatus.Root>
	)
}
