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
	/** 已由查询下推的 filter，客户端跳过二次过滤 */
	serverDrivenFilters?: readonly import('./useTaskPageFilterController').TaskPageServerDrivenFilter[]
	/**
	 * 外部 filter（list 场景：filter 状态驱动 listInput，须在 collection 之上创建）。
	 * 提供时内部仍调用 hook（Rules of Hooks），但交互与 filteredTasks 以外部为准。
	 */
	externalFilter?: ReturnType<typeof useTaskPageFilterController>
}

const EMPTY_TASKS_FOR_EXTERNAL_FILTER: import('@/shared/types').TaskListItem[] = []

/**
 * 任务集合的唯一交互编排。
 * 数据源与页面专属动作由调用方提供；筛选、展示、选择、预览、批量和 Board 接线只在 task 域维护。
 */
export function useTaskCollectionScene(input: TaskCollectionSceneInput) {
	const display = useTaskDisplayOptions(input.displayPageKey)
	const internalFilter = useTaskPageFilterController({
		// 外部 filter 时内部仅占位，避免双状态源
		tasks: input.externalFilter ? EMPTY_TASKS_FOR_EXTERNAL_FILTER : input.source.items,
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
		...(input.serverDrivenFilters ? { serverDrivenFilters: input.serverDrivenFilters } : {}),
	})
	const filter = input.externalFilter ?? internalFilter
	const { controller, filteredTasks, querySlice } = filter
	// 外部 filter 时任务已下推过滤：直接用 source.items
	const boardTasks = input.externalFilter ? input.source.items : filteredTasks
	useRegisterPageFilterController(controller)

	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: boardTasks,
				options: display.options,
				context: createTaskDisplayApplyContext(input.displayPageKey),
			}),
		[boardTasks, display.options, input.displayPageKey],
	)
	const selection = useTaskSelection(displayResult.selectionOrderIds)
	const mutations = useTaskListController()

	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selection.selectionSnapshot.ids,
				tasks: boardTasks,
				fallbackSubtitle: input.fallbackSubtitle,
				focusedTaskId: selection.focusedTaskId,
				clearSelection: selection.clearTaskSelection,
			}),
		[
			boardTasks,
			input.fallbackSubtitle,
			selection.clearTaskSelection,
			selection.focusedTaskId,
			selection.selectionSnapshot.ids,
		],
	)
	useRegisterCommandSelection(commandSelection)
	useRegisterTaskPreviewSource({
		tasks: boardTasks,
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
		/** filter 查询切片：list 场景用于驱动 listInput 下推 */
		filterQuerySlice: querySlice,
		displayPageKey: input.displayPageKey,
		selectedCount: selection.selectedCount,
		clearTaskSelection: selection.clearTaskSelection,
	}
}
