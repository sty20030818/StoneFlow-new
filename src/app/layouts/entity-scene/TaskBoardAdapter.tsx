import { Button } from '@/shared/ui/base/button'
import { TASK_BULK_ACTION_BUTTON_CLASS } from '@/shared/ui/patterns/task-row'

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

/** 独立事项和项目详情页不显示 ProjectCell 下拉选项 */
const HIDE_PROJECT_OPTIONS_VARIANTS = new Set(['no-project', 'project-detail'])

/**
 * 任务实体适配层。
 * scene 层只提供数据和动作，不感知任务 board 的具体实现。
 */
export function TaskBoardAdapter({ config, data, actions }: TaskBoardAdapterProps) {
	const showProjectOptions = !HIDE_PROJECT_OPTIONS_VARIANTS.has(config.variant)

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
			onSelectNoProject={showProjectOptions ? actions.onSelectNoProject : undefined}
			onSelectProject={showProjectOptions ? actions.onSelectProject : undefined}
			onToggleTaskSelection={actions.onToggleTaskSelection ?? (() => undefined)}
			onToggleTaskStatus={actions.onToggleTaskStatus ?? (async () => undefined)}
			onUpdateTaskPriority={actions.onUpdateTaskPriority ?? (async () => undefined)}
			onUpdateTaskStatus={actions.onUpdateTaskStatus ?? (async () => undefined)}
			pendingTaskId={data.pendingItemId ?? null}
			projectOptions={showProjectOptions ? actions.projectOptions : undefined}
			sectionVariant={config.sectionVariant}
			selectedTaskIdSet={data.selectedTaskIdSet ?? new Set<string>()}
			statusOrder={config.statusOrder}
			tasks={data.items ?? []}
		/>
	)
}

export function createPendingBulkAction(label: string) {
	return (
		<Button
			className={`${TASK_BULK_ACTION_BUTTON_CLASS} opacity-70`}
			disabled
			size='sm'
			variant='outline'
		>
			{label}
		</Button>
	)
}
