import { Button } from '@/shared/components/base/button'
import { BULK_ACTION_BUTTON_CLASS } from '@/shared/components/patterns/bulk-action'

import { TaskBoard } from '@/features/task/components/TaskBoard'

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

/** 独立事项和项目详情页不显示行内 ProjectCell 下拉选项 */
const HIDE_PROJECT_CELL_OPTIONS_VARIANTS = new Set(['no-project', 'project-detail'])

/**
 * 任务实体适配层。
 * scene 层只提供数据和动作，不感知任务 board 的具体实现。
 */
export function TaskBoardAdapter({ config, data, actions }: TaskBoardAdapterProps) {
	const showProjectCellOptions = !HIDE_PROJECT_CELL_OPTIONS_VARIANTS.has(config.variant)

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
			onClearTaskSelection={actions.onClearTaskSelection}
			onDeleteTask={actions.onDeleteTask}
			onEmptyAction={actions.onEmptyAction ?? (() => undefined)}
			onMoveTaskFocus={actions.onMoveTaskFocus}
			onOpenTask={actions.onOpenTask ?? (() => undefined)}
			onPeekTask={actions.onPeekTask ?? (() => undefined)}
			onSelectAllTasks={actions.onSelectAllTasks}
			onSetFocusedTask={actions.onSetFocusedTask}
			onSelectPlacement={actions.onSelectPlacement}
			onToggleTaskSelection={actions.onToggleTaskSelection ?? (() => undefined)}
			onToggleTaskStatus={actions.onToggleTaskStatus ?? (async () => undefined)}
			onUpdateTaskDueDate={actions.onUpdateTaskDueDate}
			onUpdateTaskScheduledAt={actions.onUpdateTaskScheduledAt}
			onUpdateTaskReminderAt={actions.onUpdateTaskReminderAt}
			onUpdateTaskPriority={actions.onUpdateTaskPriority ?? (async () => undefined)}
			onUpdateTaskStatus={actions.onUpdateTaskStatus ?? (async () => undefined)}
			pendingTaskId={data.pendingItemId ?? null}
			projectOptions={actions.projectOptions}
			spaces={actions.spaces}
			showProjectCellOptions={actions.showProjectCellOptions ?? showProjectCellOptions}
			focusedTaskId={data.focusedTaskId ?? null}
			selectedTaskIdSet={data.selectedTaskIdSet ?? new Set<string>()}
			status={data.status ?? 'ready'}
			statusOrder={config.statusOrder}
			tasks={data.items ?? []}
			visibleProperties={config.visibleProperties}
		/>
	)
}

export function createPendingBulkAction(label: string) {
	return (
		<Button
			className={`${BULK_ACTION_BUTTON_CLASS} opacity-70`}
			disabled
			size='sm'
			variant='outline'
		>
			{label}
		</Button>
	)
}
