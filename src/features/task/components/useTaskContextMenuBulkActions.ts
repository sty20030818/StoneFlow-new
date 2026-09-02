import { useCallback, useMemo } from 'react'

import {
	TASK_BULK_ACTION_IDS,
	createTaskBulkSelectionSnapshotFromTasks,
	type BulkActionId,
	type BulkActionPayload,
} from '@/features/bulk-action'
import { useBulkActionContext } from '@/features/bulk-action'
import { showBulkActionResultToast } from '@/features/bulk-action'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type { TaskListItem, TaskStatus } from '@/shared/types'

export type TaskContextMenuBulkActions = {
	onSelectDueDate: (tasks: TaskListItem[], dueAt: string | null) => void
	onSelectPlacement: (tasks: TaskListItem[], target: TaskPlacementTarget) => void
	onSelectPriority: (tasks: TaskListItem[], priority: TaskPriorityValue) => void
	onSelectStatus: (tasks: TaskListItem[], status: TaskStatus) => void
}

export function useTaskContextMenuBulkActions(): TaskContextMenuBulkActions {
	const { runBulkAction } = useBulkActionContext()

	const runTaskContextMenuBulkAction = useCallback(
		async (tasks: TaskListItem[], actionId: BulkActionId, payload?: BulkActionPayload) => {
			if (tasks.length === 0) {
				return
			}

			const snapshot = createTaskBulkSelectionSnapshotFromTasks(tasks, 'context-menu')
			const result = await runBulkAction(actionId, snapshot, payload)

			showBulkActionResultToast(result, {
				successVerb: isTaskMoveAction(actionId) ? '整理' : '更新',
				entityLabel: '任务',
			})
		},
		[runBulkAction],
	)

	return useMemo<TaskContextMenuBulkActions>(
		() => ({
			onSelectDueDate: (tasks, dueAt) =>
				void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.setDateSelected, {
					dueAt,
				}),
			onSelectPlacement: (tasks, target) =>
				void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.setPlacementSelected, {
					target,
				}),
			onSelectPriority: (tasks, priority) =>
				void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.setPrioritySelected, {
					priority,
				}),
			onSelectStatus: (tasks, status) =>
				void runTaskContextMenuBulkAction(tasks, TASK_BULK_ACTION_IDS.setStatusSelected, {
					status,
				}),
		}),
		[runTaskContextMenuBulkAction],
	)
}

function isTaskMoveAction(actionId: BulkActionId) {
	return actionId === TASK_BULK_ACTION_IDS.setPlacementSelected
}
