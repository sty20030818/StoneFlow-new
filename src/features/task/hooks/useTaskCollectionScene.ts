/**
 * 任务集合编排：数据源 + Display 呈现 + 选择/预览/Board。
 * 筛选会话与查询下推由各列表 scene 持有；本 hook 不维护第二套 filter 状态。
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'

import {
	applyTaskDisplayOptionsToTasks,
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
import { useShellPreferenceStore } from '@/features/shell-dialogs'
import type { Space, TaskListItem, TaskQueryItem } from '@/shared/types'
import { useEventSubscription } from '@/shared/events'

import type { TaskBoardPagination, TaskBoardProps } from '../components/TaskBoard'
import { useRegisterTaskPreviewSource } from '../detail/model/TaskPreviewProvider'
import { useTaskPreviewController } from '../detail/model/useTaskPreviewController'
import { buildTaskCommandSelection } from '../model/buildTaskCommandSelection'
import { buildTaskBoardCollection } from '../model/taskBoardCollection'
import { indexTasksById } from '../model/taskCollectionIndex'
import { buildTaskBoardFlatItems } from '../model/taskBoardModel'
import { useTaskListController } from './useTaskListController'
import { useTaskSelection } from './useTaskSelection'

type TaskCollectionSource = {
	items: TaskQueryItem[]
	collapseScopeKey: string
	status: NonNullable<TaskBoardProps['status']>
	onRetry: TaskBoardProps['onRetry']
}

type PendingTaskDeleteBatch = {
	sourceKey: string
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
	projectOptions: ProjectOption[]
	spaces: Space[]
	showProjectCellOptions: boolean
	showSpaceLabel?: boolean
	createProjectId?: string | null
	empty: Pick<
		TaskBoardProps,
		'emptyTitle' | 'emptyDescription' | 'emptyActionLabel' | 'onEmptyAction'
	>
	pagination: TaskBoardPagination
}

const EMPTY_COLLAPSED_GROUP_KEYS: readonly string[] = []

/**
 * 任务集合的交互编排（展示 / 选择 / 预览 / 批量 / Board）。
 * 调用方负责：查询结果、筛选会话、display 订阅、页面专属动作。
 */
export function useTaskCollectionScene(input: TaskCollectionSceneInput) {
	const display = input.display
	const collapseKey = JSON.stringify([input.source.collapseScopeKey, display.options.groupBy])
	const collapsedGroupKeys = useShellPreferenceStore(
		(state) => state.taskBoardCollapsedGroups[collapseKey] ?? EMPTY_COLLAPSED_GROUP_KEYS,
	)
	const setCollapsedGroups = useShellPreferenceStore((state) => state.setTaskBoardCollapsedGroups)
	const sourceKey = input.pagination.sourceKey
	const [focusRequest, setFocusRequest] = useState<{
		sourceKey: string
		intent: CollectionFocusIntent<string, string>
	} | null>(null)
	// 渲染时即隔离旧窗口意图，避免子 Board 在 layout effect 中提前消费。
	if (focusRequest && focusRequest.sourceKey !== sourceKey) setFocusRequest(null)
	const focusIntent = focusRequest?.sourceKey === sourceKey ? focusRequest.intent : null
	const setFocusIntent = useCallback(
		(intent: CollectionFocusIntent<string, string> | null) => {
			setFocusRequest(intent ? { sourceKey, intent } : null)
		},
		[sourceKey],
	)
	const pendingDeleteBatchRef = useRef<PendingTaskDeleteBatch | null>(null)
	const taskById = useMemo(() => indexTasksById(input.source.items), [input.source.items])

	const displayResult = useMemo(
		() =>
			applyTaskDisplayOptionsToTasks({
				items: input.source.items,
				options: display.options,
			}),
		[display.options, input.source.items],
	)
	const flatItems = useMemo(
		() => buildTaskBoardFlatItems({ sections: displayResult.sections, collapsedGroupKeys }),
		[displayResult.sections, collapsedGroupKeys],
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
	const updateTaskPlacement = mutations.updateTaskPlacement
	const handleSelectPlacement = useCallback(
		(task: TaskListItem, target: Parameters<typeof updateTaskPlacement>[1]) => {
			void updateTaskPlacement(task, target)
		},
		[updateTaskPlacement],
	)
	useEventSubscription('task:deleted', (event) => {
		if (
			event.type !== 'task:deleted' ||
			!collection.projection.eligibleIndexByKey.has(event.payload.taskId)
		) {
			return
		}

		const pendingBatch = pendingDeleteBatchRef.current
		if (pendingBatch) {
			pendingBatch.taskIds.add(event.payload.taskId)
			return
		}

		pendingDeleteBatchRef.current = {
			sourceKey,
			taskIds: new Set([event.payload.taskId]),
			state: selection.interaction.getSnapshot(),
			projection: collection.projection,
		}
	})
	useLayoutEffect(() => {
		const pendingBatch = pendingDeleteBatchRef.current
		if (pendingBatch && pendingBatch.sourceKey !== sourceKey) {
			pendingDeleteBatchRef.current = null
			return
		}
		if (
			!pendingBatch ||
			![...pendingBatch.taskIds].every(
				(taskId) => !collection.projection.eligibleIndexByKey.has(taskId),
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
	}, [collection.projection, selection.interaction, sourceKey, setFocusIntent])
	const handleFocusIntentConsumed = useCallback(
		(consumedIntent: CollectionFocusIntent<string, string>) => {
			setFocusRequest((current) => (current?.intent === consumedIntent ? null : current))
		},
		[],
	)
	const buildCollectionForCollapsedGroups = useCallback(
		(nextCollapsedGroupKeys: readonly string[]) =>
			buildTaskBoardCollection({
				eligibleKeys: displayResult.selectionOrderIds,
				flatItems: buildTaskBoardFlatItems({
					sections: displayResult.sections,
					collapsedGroupKeys: nextCollapsedGroupKeys,
				}),
			}),
		[displayResult.sections, displayResult.selectionOrderIds],
	)
	const applyCollapsedGroups = useCallback(
		(nextCollapsedGroupKeys: readonly string[], collapsedGroupKey: string | null) => {
			let nextFocusIntent: CollectionFocusIntent<string, string> | null = null
			const collapsedKeys = collapsedGroupKey
				? collection.rowKeysByGroupKey.get(collapsedGroupKey)
				: undefined

			if (collapsedGroupKey && collapsedKeys) {
				const currentState = selection.interaction.getSnapshot()
				const nextCollection = buildCollectionForCollapsedGroups(nextCollapsedGroupKeys)
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
			setCollapsedGroups(collapseKey, nextCollapsedGroupKeys)
		},
		[
			buildCollectionForCollapsedGroups,
			collection,
			selection.interaction,
			collapseKey,
			setCollapsedGroups,
			setFocusIntent,
		],
	)
	const handleSectionOpenChange = useCallback(
		(groupKey: string, open: boolean) => {
			const nextCollapsedGroupKeys = open
				? collapsedGroupKeys.filter((key) => key !== groupKey)
				: [...new Set([...collapsedGroupKeys, groupKey])]
			applyCollapsedGroups(nextCollapsedGroupKeys, open ? null : groupKey)
		},
		[applyCollapsedGroups, collapsedGroupKeys],
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
		applyCollapsedGroups(
			[...new Set([...collapsedGroupKeys, ...collection.rowKeysByGroupKey.keys()])],
			focusedGroupKey,
		)
	}, [
		applyCollapsedGroups,
		collapsedGroupKeys,
		collection.rowKeysByGroupKey,
		selection.interaction.focusedKey,
	])
	const handleExpandAll = useCallback(() => {
		applyCollapsedGroups([], null)
	}, [applyCollapsedGroups])

	const commandSelection = useMemo(
		() =>
			buildTaskCommandSelection({
				selectedIds: selection.selectionSnapshot.ids,
				taskById,
				fallbackSubtitle: input.fallbackSubtitle,
				focusedTaskId: selection.interaction.focusedKey,
				clearSelection: selection.interaction.clearSelection,
			}),
		[
			input.fallbackSubtitle,
			selection.interaction.clearSelection,
			selection.interaction.focusedKey,
			selection.selectionSnapshot.ids,
			taskById,
		],
	)
	const readCommandSelection = useCallback(() => commandSelection, [commandSelection])
	useRegisterCommandSelection(readCommandSelection)
	useRegisterTaskPreviewSource({
		taskById,
		focusedTaskId: selection.interaction.focusedKey,
		activeTaskId: input.activeTaskId,
	})
	const boardProps = useMemo(
		(): TaskBoardProps => ({
			activeTaskId: input.activeTaskId,
			boardCollection: collection,
			taskById,
			collectionInteraction: selection.interaction,
			createProjectId: input.createProjectId ?? null,
			emptyActionLabel: input.empty.emptyActionLabel,
			emptyDescription: input.empty.emptyDescription,
			emptyTitle: input.empty.emptyTitle,
			flatItems,
			focusIntent,
			onCollapseAll: handleCollapseAll,
			onEmptyAction: input.empty.onEmptyAction,
			onExpandAll: handleExpandAll,
			onFocusIntentConsumed: handleFocusIntentConsumed,
			onRetry: input.source.onRetry,
			onSectionOpenChange: handleSectionOpenChange,
			onSelectPlacement: handleSelectPlacement,
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
			pagination: input.pagination,
		}),
		[
			collection,
			displayResult.orderedItems,
			displayResult.visibleProperties,
			flatItems,
			focusIntent,
			handleCollapseAll,
			handleExpandAll,
			handleFocusIntentConsumed,
			handleSelectPlacement,
			handleSectionOpenChange,
			input.activeTaskId,
			input.createProjectId,
			input.empty.emptyActionLabel,
			input.empty.emptyDescription,
			input.empty.emptyTitle,
			input.empty.onEmptyAction,
			input.projectOptions,
			input.pagination,
			input.showProjectCellOptions,
			input.showSpaceLabel,
			input.source.status,
			input.source.onRetry,
			input.spaces,
			mutations,
			selection.interaction,
			taskById,
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
