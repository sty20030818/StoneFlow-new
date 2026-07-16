import { ProjectBoard } from '@/features/project/components/ProjectBoard'

import type {
	EntitySceneProjectBoardActions,
	EntitySceneProjectBoardConfig,
	EntitySceneProjectBoardData,
} from './types'

type ProjectBoardAdapterProps = {
	config: EntitySceneProjectBoardConfig
	data: EntitySceneProjectBoardData
	actions: EntitySceneProjectBoardActions
}

/**
 * 项目实体适配层。
 * scene 层只提供数据和动作，不感知项目 board 的具体列表结构。
 */
export function ProjectBoardAdapter({ config, data, actions }: ProjectBoardAdapterProps) {
	return (
		<ProjectBoard
			busyProjectId={data.busyProjectId ?? null}
			emptyActionLabel={config.emptyActionLabel}
			emptyDescription={config.emptyDescription}
			emptyTitle={config.emptyTitle}
			items={data.items ?? []}
			onArchive={(projectId) => actions.onArchiveProject?.(projectId)}
			onComplete={(projectId) => actions.onCompleteProject?.(projectId)}
			onDelete={(projectId) => actions.onDeleteProject?.(projectId)}
			onEmptyAction={actions.onEmptyAction}
			onOpen={(projectId) => actions.onOpenProject?.(projectId)}
			onReopen={(projectId) => actions.onReopenProject?.(projectId)}
			onClearProjectSelection={actions.onClearProjectSelection}
			onMoveProjectFocus={actions.onMoveProjectFocus}
			onSetFocusedProject={actions.onSetFocusedProject}
			onSelectAllProjects={actions.onSelectAllProjects}
			onToggleProjectSelection={actions.onToggleProjectSelection}
			focusedProjectId={data.focusedProjectId ?? null}
			selectedProjectIds={data.selectedProjectIds}
			status={data.status ?? 'ready'}
			variant='overview'
		/>
	)
}
