import { useState } from 'react'

import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskListItem, TaskStatus } from '@/shared/types'

import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import {
	useArchiveTaskMutation,
	useDeleteTaskMutation,
	useUpdateTaskMutation,
} from '@/features/task/hooks/task.mutations'

/**
 * 统一收口任务列表页的常用动作，避免每个页面重复维护 pending / mutation 编排。
 */
export function useTaskListController() {
	const updateTask = useUpdateTaskMutation()
	const archiveTask = useArchiveTaskMutation()
	const deleteTask = useDeleteTaskMutation()
	const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)

	async function runTaskAction(taskId: string, runner: () => Promise<unknown>) {
		setPendingTaskId(taskId)
		try {
			await runner()
		} finally {
			setPendingTaskId(null)
		}
	}

	async function updateTaskStatus(task: TaskListItem, status: TaskStatus) {
		await runTaskAction(task.id, () =>
			updateTask.mutateAsync({
				taskId: task.id,
				status,
			}),
		)
	}

	async function updateTaskPriority(task: TaskListItem, priority: TaskPriorityValue) {
		await runTaskAction(task.id, () =>
			updateTask.mutateAsync({
				taskId: task.id,
				priority,
			}),
		)
	}

	async function updateTaskDueDate(task: TaskListItem, dueAt: string | null) {
		await runTaskAction(task.id, () =>
			updateTask.mutateAsync({
				taskId: task.id,
				dueAt,
			}),
		)
	}

	async function updateTaskScheduledAt(task: TaskListItem, plannedAt: string | null) {
		await runTaskAction(task.id, () =>
			updateTask.mutateAsync({
				taskId: task.id,
				plannedAt,
			}),
		)
	}

	async function updateTaskReminderAt(task: TaskListItem, remindAt: string | null) {
		await runTaskAction(task.id, () =>
			updateTask.mutateAsync({
				taskId: task.id,
				remindAt,
			}),
		)
	}

	async function updateTaskPlacement(task: TaskListItem, target: TaskPlacementTarget) {
		await runTaskAction(task.id, () =>
			updateTask.mutateAsync({
				taskId: task.id,
				placement:
					target.kind === 'project'
						? {
								kind: 'project',
								spaceId: target.spaceId,
								projectId: target.projectId,
							}
						: target.kind === 'inbox'
							? {
									kind: 'inbox',
									spaceId: target.spaceId,
								}
							: {
									kind: 'noProject',
									spaceId: target.spaceId,
								},
			}),
		)
	}

	async function toggleTaskStatus(task: TaskListItem) {
		await updateTaskStatus(
			task,
			task.status === 'done' || task.status === 'canceled' ? 'todo' : 'done',
		)
	}

	async function archiveListTask(task: TaskListItem) {
		await runTaskAction(task.id, () => archiveTask.mutateAsync(task.id))
	}

	async function deleteListTask(task: TaskListItem) {
		await runTaskAction(task.id, () => deleteTask.mutateAsync(task.id))
	}

	return {
		pendingTaskId,
		updateTaskStatus,
		updateTaskPriority,
		updateTaskDueDate,
		updateTaskScheduledAt,
		updateTaskReminderAt,
		updateTaskPlacement,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
	}
}
