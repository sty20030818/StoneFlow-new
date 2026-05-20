import { useCallback } from 'react'

import {
	TASK_BULK_ACTION_IDS,
	createTaskBulkSelectionSnapshotFromTasks,
	shouldClearBulkSelection,
	type BulkActionId,
	type BulkActionPayload,
} from '@/features/bulk-action/core'
import { useBulkActionContext } from '@/features/bulk-action/runtime'
import { showBulkActionResultToast } from '@/features/bulk-action/ui'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskListItem, TaskStatus } from '@/shared/types'

export type TaskContextMenuBulkActions = {
	onArchive: (tasks: TaskListItem[]) => void
	onMoveToTrash: (tasks: TaskListItem[]) => void
	onSelectDueDate: (tasks: TaskListItem[], dueAt: string | null) => void
	onSelectNoProject: (tasks: TaskListItem[]) => void
	onSelectPriority: (tasks: TaskListItem[], priority: TaskPriorityValue) => void
	onSelectProject: (tasks: TaskListItem[], projectId: string) => void
	onSelectStatus: (tasks: TaskListItem[], status: TaskStatus) => void
}

export function useTaskContextMenuBulkActions({
	onClearTaskSelection,
}: {
	onClearTaskSelection?: () => void
} = {}): TaskContextMenuBulkActions {
	const { runBulkAction } = useBulkActionContext()

	const runTaskContextMenuBulkAction = useCallback(
		async (tasks: TaskListItem[], actionId: BulkActionId, payload?: BulkActionPayload) => {
			if (tasks.length === 0) {
				return
			}

			const snapshot = createTaskBulkSelectionSnapshotFromTasks(tasks, 'context-menu')
			const result = await runBulkAction(actionId, snapshot, payload)
			if (shouldClearBulkSelection(result)) {
				onClearTaskSelection?.()
			}

			showBulkActionResultToast(result, {
				successVerb: isTaskMoveAction(actionId) ? '整理' : '更新',
				entityLabel: '任务',
			})
		},
		[onClearTaskSelection, runBulkAction],
	)

	return {
		onArchive: (tasks) =>
			void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.archiveSelected),
		onMoveToTrash: (tasks) =>
			void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.deleteSelected),
		onSelectDueDate: (tasks, dueAt) =>
			void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.setDateSelected, {
				dueAt,
			}),
		onSelectNoProject: (tasks) =>
			void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.moveToNoProjectSelected),
		onSelectPriority: (tasks, priority) =>
			void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.setPrioritySelected, {
				priority,
			}),
		onSelectProject: (tasks, projectId) =>
			void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.moveToProjectSelected, {
				projectId,
			}),
		onSelectStatus: (tasks, status) =>
			void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.setStatusSelected, {
				status,
			}),
	}
}

function isTaskMoveAction(actionId: BulkActionId) {
	return (
		actionId === TASK_BULK_ACTION_IDS.moveToProjectSelected ||
		actionId === TASK_BULK_ACTION_IDS.moveToNoProjectSelected ||
		actionId === TASK_BULK_ACTION_IDS.moveToInboxSelected
	)
}
