/**
 * 任务集合编排：数据源 + Display 呈现 + 选择/预览/Board。
 * 筛选会话与查询下推由各列表 scene 持有；本 hook 不维护第二套 filter 状态。
 */
import { useMemo } from 'react'

import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
	useTaskDisplayOptions,
	type TaskDisplayPageKey,
} from '@/features/display-options'
import { useEntitySelectionEscape, useRegisterCommandSelection } from '@/features/selection'
import type { ProjectOption } from '@/features/project'
import type { Space, TaskListItem } from '@/shared/types'

import type { TaskBoardProps } from '../components/TaskBoard'
import { useRegisterTaskPreviewSource } from '../detail/model/TaskPreviewProvider'
import { buildTaskCommandSelection } from '../model/buildTaskCommandSelection'
import { useTaskListController } from './useTaskListController'
import { useTaskSelection } from './useTaskSelection'

type TaskCollectionSource = {
	items: TaskListItem[]
	status: NonNullable<TaskBoardProps['status']>
}

export type TaskCollectionSceneInput = {
	source: TaskCollectionSource
	displayPageKey: TaskDisplayPageKey
	projects?: ProjectOption[]
	supportsProject: boolean
	fallbackSubtitle: string | ((task: TaskListItem) => string)
	activeTaskId: string | null
	onCreateTask: () => void
	onOpenTask: (taskId: string) => void
	onPeekTask: (taskId: string, source: 'keyboard' | 'pointer') => void
	projectOptions: ProjectOption[]
	spaces: Space[]
	showProjectCellOptions: boolean
	showSpaceLabel?: boolean
	createProjectId?: string | null
	empty: Pick<TaskBoardProps, 'emptyTitle' | 'emptyDescription' | 'emptyActionLabel'>
	hasNextPage?: boolean
	isFetchingNextPage?: boolean
	fetchNextPage?: () => void
	fetchNextPageError?: string | null
	totalCount?: number
	loadedCount?: number
}

/**
 * 任务集合的交互编排（展示 / 选择 / 预览 / 批量 / Board）。
 * 调用方负责：查询结果、筛选会话、页面专属动作。
 */
export function useTaskCollectionScene(input: TaskCollectionSceneInput) {
	const display = useTaskDisplayOptions(input.displayPageKey)

	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: input.source.items,
				options: display.options,
				context: createTaskDisplayApplyContext(input.displayPageKey),
			}),
		[display.options, input.displayPageKey, input.source.items],
	)
	const selection = useTaskSelection(displayResult.selectionOrderIds)
	const mutations = useTaskListController()

	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selection.selectionSnapshot.ids,
				tasks: input.source.items,
				fallbackSubtitle: input.fallbackSubtitle,
				focusedTaskId: selection.focusedTaskId,
				clearSelection: selection.clearTaskSelection,
			}),
		[
			input.fallbackSubtitle,
			input.source.items,
			selection.clearTaskSelection,
			selection.focusedTaskId,
			selection.selectionSnapshot.ids,
		],
	)
	useRegisterCommandSelection(commandSelection)
	useRegisterTaskPreviewSource({
		tasks: input.source.items,
		focusedTaskId: selection.focusedTaskId,
		activeTaskId: input.activeTaskId,
	})
	useEntitySelectionEscape({
		hasSelection: selection.selectedCount > 0,
		clearSelection: selection.clearTaskSelection,
	})

	const boardProps = useMemo(
		(): TaskBoardProps => ({
			activeTaskId: input.activeTaskId,
			createProjectId: input.createProjectId ?? null,
			customSections: displayResult.boardPatch.customSections,
			emptyActionLabel: input.empty.emptyActionLabel,
			emptyDescription: input.empty.emptyDescription,
			emptyTitle: input.empty.emptyTitle,
			focusedTaskId: selection.focusedTaskId,
			hideEmptySections: displayResult.boardPatch.hideEmptySections ?? true,
			onArchiveTask: mutations.archiveListTask,
			onClearTaskSelection: selection.clearTaskSelection,
			onDeleteTask: mutations.deleteListTask,
			onEmptyAction: input.onCreateTask,
			onMoveTaskFocus: selection.moveFocus,
			onOpenTask: input.onOpenTask,
			onPeekTask: input.onPeekTask,
			onSelectAllTasks: selection.selectTaskIds,
			onSelectPlacement: (task, target) => void mutations.updateTaskPlacement(task, target),
			onSetFocusedTask: selection.setFocusedTaskId,
			onToggleTaskSelection: selection.toggleTaskSelection,
			onToggleTaskStatus: mutations.toggleTaskStatus,
			onUpdateTaskDueDate: mutations.updateTaskDueDate,
			onUpdateTaskPriority: mutations.updateTaskPriority,
			onUpdateTaskReminderAt: mutations.updateTaskReminderAt,
			onUpdateTaskScheduledAt: mutations.updateTaskScheduledAt,
			onUpdateTaskStatus: mutations.updateTaskStatus,
			pendingTaskId: mutations.pendingTaskId,
			projectOptions: input.projectOptions,
			selectedTaskIdSet: selection.selectedTaskIdSet,
			showProjectCellOptions: input.showProjectCellOptions,
			showSpaceLabel: input.showSpaceLabel ?? false,
			spaces: input.spaces,
			status: input.source.status,
			statusOrder: displayResult.boardPatch.statusOrder,
			tasks: displayResult.orderedItems,
			visibleProperties: displayResult.visibleProperties,
			hasNextPage: input.hasNextPage,
			isFetchingNextPage: input.isFetchingNextPage,
			onFetchNextPage: input.fetchNextPage,
			fetchNextPageError: input.fetchNextPageError,
			totalCount: input.totalCount,
			loadedCount: input.loadedCount,
		}),
		[
			displayResult.boardPatch.customSections,
			displayResult.boardPatch.hideEmptySections,
			displayResult.boardPatch.statusOrder,
			displayResult.orderedItems,
			displayResult.visibleProperties,
			input.activeTaskId,
			input.createProjectId,
			input.empty.emptyActionLabel,
			input.empty.emptyDescription,
			input.empty.emptyTitle,
			input.fetchNextPage,
			input.fetchNextPageError,
			input.hasNextPage,
			input.isFetchingNextPage,
			input.onCreateTask,
			input.onOpenTask,
			input.onPeekTask,
			input.projectOptions,
			input.showProjectCellOptions,
			input.showSpaceLabel,
			input.source.status,
			input.spaces,
			input.totalCount,
			input.loadedCount,
			mutations,
			selection,
		],
	)

	return {
		boardProps,
		display,
		displayPageKey: input.displayPageKey,
		selectedCount: selection.selectedCount,
		clearTaskSelection: selection.clearTaskSelection,
	}
}
