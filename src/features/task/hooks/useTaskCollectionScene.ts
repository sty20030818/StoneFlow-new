/**
 * 任务集合编排：数据源 + Display 呈现 + 选择/预览/Board。
 * 筛选会话与查询下推由各列表 scene 持有；本 hook 不维护第二套 filter 状态。
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
	applyTaskDisplayOptionsToTasks,
	createTaskDisplayApplyContext,
	type TaskDisplayPageKey,
	type UseTaskDisplayOptionsResult,
} from '@/features/display-options'
import {
	reconcileCollapsedGroup,
	reconcileCollectionProjection,
	useRegisterCommandSelection,
	type CollectionFocusIntent,
	type CollectionProjection,
	type CollectionState,
} from '@/features/selection'
import type { ProjectOption } from '@/features/project'
import {
	selectProjectTaskBoardOpenSections,
	useShellPreferenceStore,
} from '@/features/shell-dialogs'
import type { Space, TaskListItem } from '@/shared/types'
import { useEventSubscription } from '@/shared/events'

import type { TaskBoardProps } from '../components/TaskBoard'
import { useRegisterTaskPreviewSource } from '../detail/model/TaskPreviewProvider'
import { useTaskPreviewController } from '../detail/model/useTaskPreviewController'
import { buildTaskCommandSelection } from '../model/buildTaskCommandSelection'
import { buildTaskBoardCollection } from '../model/taskBoardCollection'
import { buildTaskBoardFlatItems } from '../model/taskBoardModel'
import { TASK_BOARD_STATUS_ORDER } from '../model/taskBoardOrder'
import { useTaskListController } from './useTaskListController'
import { useTaskSelection } from './useTaskSelection'

type TaskCollectionSource = {
	items: TaskListItem[]
	status: NonNullable<TaskBoardProps['status']>
}

type PendingTaskDeleteBatch = {
	taskIds: Set<string>
	state: CollectionState<string>
	projection: CollectionProjection<string>
}

export type TaskCollectionSceneInput = {
	source: TaskCollectionSource
	displayPageKey: TaskDisplayPageKey
	/** scene 已订阅的 display；避免 collection 再 hook 一次 */
	display: UseTaskDisplayOptionsResult
	fallbackSubtitle: string | ((task: TaskListItem) => string)
	activeTaskId: string | null
	onCreateTask: () => void
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
 * 调用方负责：查询结果、筛选会话、display 订阅、页面专属动作。
 */
export function useTaskCollectionScene(input: TaskCollectionSceneInput) {
	const display = input.display
	const openSections = useShellPreferenceStore(selectProjectTaskBoardOpenSections)
	const setOpenSections = useShellPreferenceStore((state) => state.setProjectTaskBoardOpenSections)
	const [focusIntent, setFocusIntent] = useState<CollectionFocusIntent<string, string> | null>(null)
	const pendingDeleteBatchRef = useRef<PendingTaskDeleteBatch | null>(null)

	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: input.source.items,
				options: display.options,
				context: createTaskDisplayApplyContext(input.displayPageKey),
			}),
		[display.options, input.displayPageKey, input.source.items],
	)
	const statusOrder = displayResult.boardPatch.statusOrder ?? TASK_BOARD_STATUS_ORDER
	const hideEmptySections = displayResult.boardPatch.hideEmptySections ?? true
	const flatItems = useMemo(
		() =>
			buildTaskBoardFlatItems({
				tasks: displayResult.orderedItems,
				statusOrder,
				openSections,
				hideEmptySections,
				customSections: displayResult.boardPatch.customSections,
			}),
		[
			displayResult.boardPatch.customSections,
			displayResult.orderedItems,
			hideEmptySections,
			openSections,
			statusOrder,
		],
	)
	const collection = useMemo(
		() =>
			buildTaskBoardCollection({
				eligibleKeys: displayResult.selectionOrderIds,
				flatItems,
			}),
		[displayResult.selectionOrderIds, flatItems],
	)
	const selection = useTaskSelection(collection.projection)
	const taskPreviewController = useTaskPreviewController()
	const mutations = useTaskListController()
	useEventSubscription('task:deleted', (event) => {
		if (
			event.type !== 'task:deleted' ||
			!collection.projection.eligibleKeys.includes(event.payload.taskId)
		) {
			return
		}

		const pendingBatch = pendingDeleteBatchRef.current
		if (pendingBatch) {
			pendingBatch.taskIds.add(event.payload.taskId)
			return
		}

		pendingDeleteBatchRef.current = {
			taskIds: new Set([event.payload.taskId]),
			state: selection.interaction.getSnapshot(),
			projection: collection.projection,
		}
	})
	useLayoutEffect(() => {
		const pendingBatch = pendingDeleteBatchRef.current
		if (
			!pendingBatch ||
			![...pendingBatch.taskIds].every(
				(taskId) => !collection.projection.eligibleKeys.includes(taskId),
			)
		) {
			return
		}

		pendingDeleteBatchRef.current = null
		if (
			pendingBatch.state.focusedKey === null ||
			!pendingBatch.taskIds.has(pendingBatch.state.focusedKey)
		) {
			return
		}

		const reconciliation = reconcileCollectionProjection(
			pendingBatch.state,
			pendingBatch.projection,
			collection.projection,
			'delete',
		)
		if (reconciliation.state.focusedKey !== pendingBatch.state.focusedKey) {
			selection.interaction.focusKey(reconciliation.state.focusedKey)
		}
		setFocusIntent(reconciliation.focusIntent)
	}, [collection.projection, selection.interaction])
	const handleFocusIntentConsumed = useCallback(
		(consumedIntent: CollectionFocusIntent<string, string>) => {
			setFocusIntent((currentIntent) => (currentIntent === consumedIntent ? null : currentIntent))
		},
		[],
	)
	const buildCollectionForOpenSections = useCallback(
		(nextOpenSections: readonly (typeof openSections)[number][]) => {
			const nextFlatItems = buildTaskBoardFlatItems({
				tasks: displayResult.orderedItems,
				statusOrder,
				openSections: nextOpenSections,
				hideEmptySections,
				customSections: displayResult.boardPatch.customSections,
			})
			return buildTaskBoardCollection({
				eligibleKeys: displayResult.selectionOrderIds,
				flatItems: nextFlatItems,
			})
		},
		[
			displayResult.boardPatch.customSections,
			displayResult.orderedItems,
			displayResult.selectionOrderIds,
			hideEmptySections,
			statusOrder,
		],
	)
	const applyOpenSections = useCallback(
		(nextOpenSections: (typeof openSections)[number][], collapsedGroupKey: string | null) => {
			let nextFocusIntent: CollectionFocusIntent<string, string> | null = null
			const collapsedKeys = collapsedGroupKey
				? collection.rowKeysByGroupKey.get(collapsedGroupKey)
				: undefined

			if (collapsedGroupKey && collapsedKeys) {
				const currentState = selection.interaction.getSnapshot()
				const nextCollection = buildCollectionForOpenSections(nextOpenSections)
				const reconciliation = reconcileCollapsedGroup(
					currentState,
					collection.projection,
					nextCollection.projection,
					{ groupKey: collapsedGroupKey, collapsedKeys },
				)
				if (reconciliation.state.focusedKey !== currentState.focusedKey) {
					selection.interaction.focusKey(reconciliation.state.focusedKey)
				}
				nextFocusIntent = reconciliation.focusIntent
			}

			setFocusIntent(nextFocusIntent)
			setOpenSections(nextOpenSections)
		},
		[buildCollectionForOpenSections, collection, selection.interaction, setOpenSections],
	)
	const handleSectionOpenChange = useCallback(
		(groupKey: string, sectionStatus: (typeof openSections)[number], open: boolean) => {
			const nextOpenSections = open
				? [...new Set([...openSections, sectionStatus])]
				: openSections.filter((status) => status !== sectionStatus)
			applyOpenSections(nextOpenSections, open ? null : groupKey)
		},
		[applyOpenSections, openSections],
	)
	const handleCollapseAll = useCallback(() => {
		const focusedKey = selection.interaction.focusedKey
		let focusedGroupKey: string | null = null
		if (focusedKey) {
			for (const [groupKey, rowKeys] of collection.rowKeysByGroupKey) {
				if (rowKeys.has(focusedKey)) {
					focusedGroupKey = groupKey
					break
				}
			}
		}
		applyOpenSections([], focusedGroupKey)
	}, [applyOpenSections, collection.rowKeysByGroupKey, selection.interaction.focusedKey])
	const handleExpandAll = useCallback(() => {
		const populatedStatuses = new Set(displayResult.orderedItems.map((task) => task.status))
		applyOpenSections(
			statusOrder.filter((status) => populatedStatuses.has(status)),
			null,
		)
	}, [applyOpenSections, displayResult.orderedItems, statusOrder])

	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selection.selectionSnapshot.ids,
				tasks: input.source.items,
				fallbackSubtitle: input.fallbackSubtitle,
				focusedTaskId: selection.interaction.focusedKey,
				clearSelection: selection.interaction.clearSelection,
			}),
		[
			input.fallbackSubtitle,
			input.source.items,
			selection.interaction.clearSelection,
			selection.interaction.focusedKey,
			selection.selectionSnapshot.ids,
		],
	)
	const readCommandSelection = useCallback(() => commandSelection, [commandSelection])
	useRegisterCommandSelection(readCommandSelection)
	useRegisterTaskPreviewSource({
		tasks: input.source.items,
		focusedTaskId: selection.interaction.focusedKey,
		activeTaskId: input.activeTaskId,
	})
	const boardProps = useMemo(
		(): TaskBoardProps => ({
			activeTaskId: input.activeTaskId,
			collectionInteraction: selection.interaction,
			createProjectId: input.createProjectId ?? null,
			emptyActionLabel: input.empty.emptyActionLabel,
			emptyDescription: input.empty.emptyDescription,
			emptyTitle: input.empty.emptyTitle,
			flatItems,
			focusIntent,
			onCollapseAll: handleCollapseAll,
			onEmptyAction: input.onCreateTask,
			onExpandAll: handleExpandAll,
			onFocusIntentConsumed: handleFocusIntentConsumed,
			onSectionOpenChange: handleSectionOpenChange,
			onSelectPlacement: (task, target) => void mutations.updateTaskPlacement(task, target),
			onToggleTaskStatus: mutations.toggleTaskStatus,
			onUpdateTaskDueDate: mutations.updateTaskDueDate,
			onUpdateTaskPriority: mutations.updateTaskPriority,
			onUpdateTaskReminderAt: mutations.updateTaskReminderAt,
			onUpdateTaskScheduledAt: mutations.updateTaskScheduledAt,
			onUpdateTaskStatus: mutations.updateTaskStatus,
			pendingTaskId: mutations.pendingTaskId,
			projectOptions: input.projectOptions,
			showProjectCellOptions: input.showProjectCellOptions,
			showSpaceLabel: input.showSpaceLabel ?? false,
			spaces: input.spaces,
			status: input.source.status,
			suppressFocusIndicator:
				taskPreviewController.previewState.open &&
				taskPreviewController.previewState.lastAnchorReason === 'keyboard',
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
			displayResult.orderedItems,
			displayResult.visibleProperties,
			flatItems,
			focusIntent,
			handleCollapseAll,
			handleExpandAll,
			handleFocusIntentConsumed,
			handleSectionOpenChange,
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
			input.projectOptions,
			input.showProjectCellOptions,
			input.showSpaceLabel,
			input.source.status,
			input.spaces,
			input.totalCount,
			input.loadedCount,
			mutations,
			selection.interaction,
			taskPreviewController.previewState.lastAnchorReason,
			taskPreviewController.previewState.open,
		],
	)

	return {
		boardProps,
		display,
		displayPageKey: input.displayPageKey,
	}
}
