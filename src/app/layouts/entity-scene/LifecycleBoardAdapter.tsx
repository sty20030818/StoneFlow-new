import { LifecycleBoard } from '@/features/lifecycle/ui/LifecycleBoard'

import type {
	EntitySceneLifecycleBoardActions,
	EntitySceneLifecycleBoardConfig,
	EntitySceneLifecycleBoardData,
} from './types'

type LifecycleBoardAdapterProps = {
	config: EntitySceneLifecycleBoardConfig
	data: EntitySceneLifecycleBoardData
	actions: EntitySceneLifecycleBoardActions
}

/**
 * 生命周期实体适配层。
 * archive / trash 都走这一套，避免再借道 task/project board。
 */
export function LifecycleBoardAdapter({ config, data, actions }: LifecycleBoardAdapterProps) {
	return (
		<LifecycleBoard
			emptyActionLabel={config.emptyActionLabel}
			emptyDescription={config.emptyDescription}
			emptyTitle={config.emptyTitle}
			mode={config.mode}
			onEmptyAction={actions.onEmptyAction}
			onOpenDetail={actions.onOpenDetail}
			onRestore={(entry) => actions.onRestore(entry)}
			onToggleEntrySelection={actions.onToggleEntrySelection}
			pendingEntryId={data.pendingEntryId ?? null}
			sections={data.sections}
			selectedEntryIdSet={data.selectedEntryIdSet}
		/>
	)
}
