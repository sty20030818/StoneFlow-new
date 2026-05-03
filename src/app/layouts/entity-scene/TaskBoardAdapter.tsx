import type { LifecycleEntry } from '@/shared/types'
import { Button } from '@/shared/ui/base/button'

import { TaskBoard } from '@/features/task/ui/TaskBoard'

import type {
	EntitySceneTaskBoardActions,
	EntitySceneTaskBoardConfig,
	EntitySceneTaskBoardData,
} from './types'

type TaskBoardAdapterProps = {
	config: EntitySceneTaskBoardConfig
	data: EntitySceneTaskBoardData
	actions: EntitySceneTaskBoardActions
}

/**
 * 任务实体适配层。
 * scene 层只提供数据和动作，不感知任务 board 的具体实现。
 */
export function TaskBoardAdapter({ config, data, actions }: TaskBoardAdapterProps) {
	return (
		<TaskBoard
			activeTaskId={data.activeItemId ?? null}
			createProjectId={config.createProjectId ?? null}
			customSections={config.customSections}
			emptyActionLabel={config.emptyActionLabel ?? '创建任务'}
			emptyDescription={config.emptyDescription}
			emptyTitle={config.emptyTitle}
			hideEmptySections={config.hideEmptySections}
			onArchiveTask={actions.onArchiveTask}
			onDeleteTask={actions.onDeleteTask}
			onEmptyAction={actions.onEmptyAction ?? (() => undefined)}
			onOpenTask={actions.onOpenTask ?? (() => undefined)}
			onToggleTaskSelection={actions.onToggleTaskSelection ?? (() => undefined)}
			onToggleTaskStatus={actions.onToggleTaskStatus ?? (async () => undefined)}
			onUpdateTaskPriority={actions.onUpdateTaskPriority ?? (async () => undefined)}
			onUpdateTaskStatus={actions.onUpdateTaskStatus ?? (async () => undefined)}
			pendingTaskId={data.pendingItemId ?? null}
			renderRowActions={config.renderRowActions}
			rowVariant={config.rowVariant}
			sectionVariant={config.sectionVariant}
			selectedTaskIdSet={data.selectedTaskIdSet ?? new Set<string>()}
			showProjectName={config.showProjectName}
			statusOrder={config.statusOrder}
			tasks={data.items ?? []}
		/>
	)
}

export function createPendingBulkAction(label: string) {
	return (
		<Button
			className='border-(--sf-color-border) bg-white text-(--sf-color-sidebar-action-foreground) opacity-70'
			disabled
			size='sm'
			variant='outline'
		>
			{label}
		</Button>
	)
}

export type { LifecycleEntry }
