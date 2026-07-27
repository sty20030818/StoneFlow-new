/**
 * Footer 同步区 view model：纯函数，UI 只渲染不推演。
 */

import type {
	SyncCredentialState,
	SyncReplicaState,
	SyncStatus,
	SyncStatusPayload,
} from '@/features/sync/api/sync'
import {
	formatReplicaState,
	formatSyncStatus,
	getSyncStatusTone,
	type SyncStatusTone,
} from '@/features/sync/model/syncStatusPresentation'

export type SyncFooterView = {
	label: string
	title: string
	tone: SyncStatusTone
	busy: boolean
	/** 同步动作是否禁用 */
	actionDisabled: boolean
	/** 同步按钮 aria / title */
	actionLabel: string
}

export type SyncFooterViewInput = {
	displayedStatus: SyncStatus
	loading: boolean
	running: boolean
	message: string | null
	statusPayload: Pick<
		SyncStatusPayload,
		'credentialState' | 'hasRemoteConfig' | 'replicaState'
	> | null
}

export function deriveSyncFooterView(input: SyncFooterViewInput): SyncFooterView {
	const hasRemoteConfig = input.statusPayload?.hasRemoteConfig ?? false
	const credentialState: SyncCredentialState = input.statusPayload?.credentialState ?? 'missing'
	const replicaState: SyncReplicaState = input.statusPayload?.replicaState ?? 'uninitialized'
	const blocked = replicaState === 'baseline_required' || replicaState === 'diverged'
	const busy = input.running || input.displayedStatus === 'syncing'
	const tone = getSyncStatusTone(input.displayedStatus)

	const label =
		credentialState === 'unavailable'
			? '凭据异常'
			: !hasRemoteConfig
				? '未配置'
				: blocked
					? formatReplicaState(replicaState)
					: input.displayedStatus === 'synced'
						? '已同步'
						: formatSyncStatus(input.displayedStatus)

	const title = input.message
		? input.message
		: credentialState === 'unavailable'
			? '无法访问同步凭据，请到设置中处理'
			: !hasRemoteConfig
				? '同步未配置远端，请到设置中配置'
				: blocked
					? formatReplicaState(replicaState)
					: formatSyncStatus(input.displayedStatus)

	return {
		label,
		title,
		tone,
		busy,
		actionDisabled: input.loading || input.running || !hasRemoteConfig || blocked,
		actionLabel: busy ? '同步中' : '立即同步',
	}
}
