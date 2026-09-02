import { useCallback, useMemo, useState } from 'react'

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
	const { mutateAsync: updateTask } = useUpdateTaskMutation()
	const { mutateAsync: archiveTask } = useArchiveTaskMutation()
	const { mutateAsync: deleteTask } = useDeleteTaskMutation()
	const [pendingTaskId, setPendingTaskId] = useState<string | null>(null)

	const runTaskAction = useCallback(async (taskId: string, runner: () => Promise<unknown>) => {
		setPendingTaskId(taskId)
		try {
			await runner()
		} finally {
			setPendingTaskId(null)
		}
	}, [])

	const updateTaskStatus = useCallback(
		async (task: TaskListItem, status: TaskStatus) => {
			await runTaskAction(task.id, () =>
				updateTask({
					taskId: task.id,
					status,
				}),
			)
		},
		[runTaskAction, updateTask],
	)

	const updateTaskPriority = useCallback(
		async (task: TaskListItem, priority: TaskPriorityValue) => {
			await runTaskAction(task.id, () =>
				updateTask({
					taskId: task.id,
					priority,
				}),
			)
		},
		[runTaskAction, updateTask],
	)

	const updateTaskDueDate = useCallback(
		async (task: TaskListItem, dueAt: string | null) => {
			await runTaskAction(task.id, () =>
				updateTask({
					taskId: task.id,
					dueAt,
				}),
			)
		},
		[runTaskAction, updateTask],
	)

	const updateTaskScheduledAt = useCallback(
		async (task: TaskListItem, plannedAt: string | null) => {
			await runTaskAction(task.id, () =>
				updateTask({
					taskId: task.id,
					plannedAt,
				}),
			)
		},
		[runTaskAction, updateTask],
	)

	const updateTaskReminderAt = useCallback(
		async (task: TaskListItem, remindAt: string | null) => {
			await runTaskAction(task.id, () =>
				updateTask({
					taskId: task.id,
					remindAt,
				}),
			)
		},
		[runTaskAction, updateTask],
	)

	const updateTaskPlacement = useCallback(
		async (task: TaskListItem, target: TaskPlacementTarget) => {
			await runTaskAction(task.id, () =>
				updateTask({
					taskId: task.id,
					placement: target,
				}),
			)
		},
		[runTaskAction, updateTask],
	)

	const toggleTaskStatus = useCallback(
		async (task: TaskListItem) => {
			await updateTaskStatus(
				task,
				task.status === 'done' || task.status === 'canceled' ? 'todo' : 'done',
			)
		},
		[updateTaskStatus],
	)

	const archiveListTask = useCallback(
		async (task: TaskListItem) => {
			await runTaskAction(task.id, () => archiveTask(task.id))
		},
		[archiveTask, runTaskAction],
	)

	const deleteListTask = useCallback(
		async (task: TaskListItem) => {
			await runTaskAction(task.id, () => deleteTask(task.id))
		},
		[deleteTask, runTaskAction],
	)

	return useMemo(
		() => ({
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
		}),
		[
			archiveListTask,
			deleteListTask,
			pendingTaskId,
			toggleTaskStatus,
			updateTaskDueDate,
			updateTaskPlacement,
			updateTaskPriority,
			updateTaskReminderAt,
			updateTaskScheduledAt,
			updateTaskStatus,
		],
	)
}
