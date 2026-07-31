import { useMemo } from 'react'

import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
	useTaskDisplayOptions,
	type TaskDisplayPageKey,
} from '@/features/display-options'
import { useRegisterPageFilterController } from '@/features/filter'
import { useEntitySelectionEscape, useRegisterCommandSelection } from '@/features/selection'
import type { ProjectOption } from '@/features/project'
import type { Space, TaskListItem } from '@/shared/types'

import type { TaskBoardProps } from '../components/TaskBoard'
import { useRegisterTaskPreviewSource } from '../detail/model/TaskPreviewProvider'
import { buildTaskCommandSelection } from '../model/buildTaskCommandSelection'
import { useTaskListController } from './useTaskListController'
import { useTaskPageFilterController } from './useTaskPageFilterController'
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
	initialShowCompleted?: boolean
	fallbackSubtitle: string | ((task: TaskListItem) => string)
	activeTaskId: string | null
	onCreateTask: () => void
	onOpenTask: (taskId: string) => void
	onPeekTask: (taskId: string, source: 'keyboard' | 'pointer') => void
	projectOptions: ProjectOption[]
	spaces: Space[]
	showProjectCellOptions: boolean
	/** 所有空间：行内固定 Space 名 */
	showSpaceLabel?: boolean
	createProjectId?: string | null
	empty: Pick<TaskBoardProps, 'emptyTitle' | 'emptyDescription' | 'emptyActionLabel'>
	/** keyset 续拉 */
	hasNextPage?: boolean
	isFetchingNextPage?: boolean
	fetchNextPage?: () => void
	fetchNextPageError?: string | null
	/** 过滤后任务总数（首屏定滚动条） */
	totalCount?: number
	/** 服务端已拉取条数（pages 展平） */
	loadedCount?: number
}

/**
 * 任务集合的唯一交互编排。
 * 数据源与页面专属动作由调用方提供；筛选、展示、选择、预览、批量和 Board 接线只在 task 域维护。
 */
export function useTaskCollectionScene(input: TaskCollectionSceneInput) {
	const display = useTaskDisplayOptions(input.displayPageKey)
	const { controller, filteredTasks } = useTaskPageFilterController({
		tasks: input.source.items,
		projects: input.supportsProject ? input.projects : undefined,
		capabilities: {
			supportsPriority: true,
			supportsStatus: true,
			supportsDate: true,
			supportsProject: input.supportsProject,
			supportsToggleCompleted: true,
			supportsClearAll: true,
		},
		...(input.initialShowCompleted === false ? { initialShowCompleted: false as const } : {}),
	})
	useRegisterPageFilterController(controller)

	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: filteredTasks,
				options: display.options,
				context: createTaskDisplayApplyContext(input.displayPageKey),
			}),
		[display.options, filteredTasks, input.displayPageKey],
	)
	const selection = useTaskSelection(displayResult.selectionOrderIds)
	const mutations = useTaskListController()

	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selection.selectionSnapshot.ids,
				tasks: filteredTasks,
				fallbackSubtitle: input.fallbackSubtitle,
				focusedTaskId: selection.focusedTaskId,
				clearSelection: selection.clearTaskSelection,
			}),
		[
			filteredTasks,
			input.fallbackSubtitle,
			selection.clearTaskSelection,
			selection.focusedTaskId,
			selection.selectionSnapshot.ids,
		],
	)
	useRegisterCommandSelection(commandSelection)
	useRegisterTaskPreviewSource({
		tasks: filteredTasks,
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
		controller,
		displayPageKey: input.displayPageKey,
		selectedCount: selection.selectedCount,
		clearTaskSelection: selection.clearTaskSelection,
	}
}
