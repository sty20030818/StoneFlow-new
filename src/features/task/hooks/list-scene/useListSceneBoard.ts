import { useCallback, useMemo } from 'react'

import type { MainCardToolbarPill } from '@/shared/components/main-card/MainCardLayout'
import type {
	EntitySceneTaskBoardActions,
	EntitySceneTaskBoardConfig,
	EntitySceneTaskBoardData,
} from '@/features/entity-scene'
import { applyTaskDisplayOptionsToTasks } from '@/features/display-options'
import type { PageFilterController } from '@/features/filter'
import type { ProjectOption } from '@/features/project'
import type { Space } from '@/shared/types'

import { formatTaskStatusLabel } from '@/features/task/model/taskStatus'
import type { useTaskListController } from '../useTaskListController'
import type { useTaskSelection } from '../useTaskSelection'
import { ALL_TASK_FILTERS, STANDALONE_STATUS_FILTERS, type VariantConfig } from './variantConfig'

type DisplayResult = ReturnType<typeof applyTaskDisplayOptionsToTasks>

type UseListSceneBoardArgs = {
	config: VariantConfig
	controller: PageFilterController
	displayResult: DisplayResult
	taskBoardStatus: EntitySceneTaskBoardData['status']
	activeTaskId: string | null
	activeDetailKind: string | undefined
	openEntityDrawer: (detail: { kind: 'task'; id: string }) => void
	openTaskCreateDialog: (draft?: VariantConfig['createDraft']) => void
	closePreview: () => void
	openPreview: (taskId: string, source: 'keyboard' | 'pointer') => void
	mutations: ReturnType<typeof useTaskListController>
	selection: Pick<
		ReturnType<typeof useTaskSelection>,
		| 'selectedTaskIdSet'
		| 'focusedTaskId'
		| 'toggleTaskSelection'
		| 'clearTaskSelection'
		| 'setFocusedTaskId'
		| 'moveFocus'
		| 'selectTaskIds'
	>
	projectOptions: ProjectOption[]
	spaces: Space[]
}

/**
 * 创建入口、toolbar pills、EntityScene board 三件套。
 */
export function useListSceneBoard({
	config,
	controller,
	displayResult,
	taskBoardStatus,
	activeTaskId,
	activeDetailKind,
	openEntityDrawer,
	openTaskCreateDialog,
	closePreview,
	openPreview,
	mutations,
	selection,
	projectOptions,
	spaces,
}: UseListSceneBoardArgs) {
	const openCreate = useCallback(() => {
		if (config.createDraft) {
			openTaskCreateDialog(config.createDraft)
			return
		}
		openTaskCreateDialog()
	}, [config.createDraft, openTaskCreateDialog])

	const toolbarPills = useMemo((): MainCardToolbarPill[] => {
		if (config.showStatusPills === 'status-only') {
			return STANDALONE_STATUS_FILTERS.map((filter) => ({
				label: filter === 'all' ? '所有任务' : formatTaskStatusLabel(filter),
				active:
					filter === 'all'
						? controller.state.statusValues.length === 0
						: controller.state.statusValues.length === 1 &&
							controller.state.statusValues[0] === filter,
				onClick: () =>
					controller.actions.applyFilter({
						kind: 'status',
						values: filter === 'all' ? [] : [filter],
					}),
			}))
		}

		return ALL_TASK_FILTERS.map((filter) => ({
			label:
				filter === 'all'
					? '所有任务'
					: filter === 'standalone'
						? '独立事项'
						: formatTaskStatusLabel(filter),
			active:
				filter === 'all'
					? controller.state.statusValues.length === 0 && !controller.state.projectlessOnly
					: filter === 'standalone'
						? controller.state.projectlessOnly
						: controller.state.statusValues.length === 1 &&
							controller.state.statusValues[0] === filter &&
							!controller.state.projectlessOnly,
			onClick: () => {
				if (filter === 'all') {
					controller.actions.applyFilter({ kind: 'status', values: [] })
					controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: false })
					return
				}

				if (filter === 'standalone') {
					controller.actions.applyFilter({ kind: 'status', values: [] })
					controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: true })
					return
				}

				controller.actions.applyFilter({ kind: 'projectlessOnly', enabled: false })
				controller.actions.applyFilter({ kind: 'status', values: [filter] })
			},
		}))
	}, [config.showStatusPills, controller])

	const boardConfig: EntitySceneTaskBoardConfig = useMemo(
		() => ({
			variant: config.boardVariant,
			customSections: displayResult.boardPatch.customSections,
			emptyActionLabel: '创建任务',
			emptyDescription: config.emptyDescription,
			emptyTitle: config.emptyTitle,
			hideEmptySections: displayResult.boardPatch.hideEmptySections ?? true,
			statusOrder: displayResult.boardPatch.statusOrder,
			visibleProperties: displayResult.visibleProperties,
		}),
		[
			config.boardVariant,
			config.emptyDescription,
			config.emptyTitle,
			displayResult.boardPatch.customSections,
			displayResult.boardPatch.hideEmptySections,
			displayResult.boardPatch.statusOrder,
			displayResult.visibleProperties,
		],
	)

	const boardData: EntitySceneTaskBoardData = useMemo(
		() => ({
			items: displayResult.orderedItems,
			status: taskBoardStatus,
			activeItemId: activeTaskId,
			pendingItemId: mutations.pendingTaskId,
			selectedTaskIdSet: selection.selectedTaskIdSet,
			focusedTaskId: selection.focusedTaskId,
		}),
		[
			activeTaskId,
			displayResult.orderedItems,
			mutations.pendingTaskId,
			selection.focusedTaskId,
			selection.selectedTaskIdSet,
			taskBoardStatus,
		],
	)

	const boardActions: EntitySceneTaskBoardActions = useMemo(
		() => ({
			onArchiveTask: mutations.archiveListTask,
			onClearTaskSelection: selection.clearTaskSelection,
			onDeleteTask: mutations.deleteListTask,
			onEmptyAction: openCreate,
			onOpenTask: (taskId) => {
				closePreview()
				openEntityDrawer({ kind: 'task', id: taskId })
			},
			onPeekTask: (taskId, source) => {
				if (activeDetailKind === 'task') {
					return
				}
				openPreview(taskId, source)
			},
			onSelectAllTasks: selection.selectTaskIds,
			onSetFocusedTask: selection.setFocusedTaskId,
			onMoveTaskFocus: selection.moveFocus,
			onSelectPlacement: (task, target) => void mutations.updateTaskPlacement(task, target),
			onToggleTaskSelection: selection.toggleTaskSelection,
			onToggleTaskStatus: mutations.toggleTaskStatus,
			onUpdateTaskDueDate: mutations.updateTaskDueDate,
			onUpdateTaskScheduledAt: mutations.updateTaskScheduledAt,
			onUpdateTaskReminderAt: mutations.updateTaskReminderAt,
			onUpdateTaskPriority: mutations.updateTaskPriority,
			onUpdateTaskStatus: mutations.updateTaskStatus,
			projectOptions,
			spaces,
		}),
		[
			activeDetailKind,
			closePreview,
			mutations,
			openCreate,
			openEntityDrawer,
			openPreview,
			projectOptions,
			selection,
			spaces,
		],
	)

	return {
		openCreate,
		toolbarPills,
		board: {
			boardKind: 'task' as const,
			boardConfig,
			boardData,
			boardActions,
		},
	}
}
