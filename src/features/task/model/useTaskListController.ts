import { useState } from 'react'

import type { TaskListItem, TaskStatus } from '@/shared/types'

import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import { useTaskStore } from '@/features/task/model/useTaskStore'

/**
 * 统一收口任务列表页的常用动作，避免每个页面重复维护 pending / mutation 编排。
 */
export function useTaskListController() {
	const updateTask = useTaskStore((state) => state.updateTask)
	const archiveTask = useTaskStore((state) => state.archiveTask)
	const deleteTask = useTaskStore((state) => state.deleteTask)
	const moveTaskToInbox = useTaskStore((state) => state.moveTaskToInbox)
	const leaveInboxToProject = useTaskStore((state) => state.leaveInboxToProject)
	const leaveInboxAsNoProject = useTaskStore((state) => state.leaveInboxAsNoProject)
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
			updateTask({
				taskId: task.id,
				status,
			}),
		)
	}

	async function updateTaskPriority(task: TaskListItem, priority: TaskPriorityValue) {
		await runTaskAction(task.id, () =>
			updateTask({
				taskId: task.id,
				priority,
			}),
		)
	}

	async function updateTaskDueDate(task: TaskListItem, dueAt: string | null) {
		await runTaskAction(task.id, () =>
			updateTask({
				taskId: task.id,
				dueAt,
			}),
		)
	}

	async function updateTaskProject(task: TaskListItem, projectId: string | null) {
		await runTaskAction(task.id, () =>
			updateTask({
				taskId: task.id,
				projectId,
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
		await runTaskAction(task.id, () => archiveTask(task.id))
	}

	async function deleteListTask(task: TaskListItem) {
		await runTaskAction(task.id, () => deleteTask(task.id))
	}

	async function moveListTaskToInbox(task: TaskListItem) {
		await runTaskAction(task.id, () =>
			moveTaskToInbox({
				taskId: task.id,
			}),
		)
	}

	async function leaveListTaskToProject(task: TaskListItem, projectId: string) {
		await runTaskAction(task.id, () =>
			leaveInboxToProject({
				taskId: task.id,
				projectId,
			}),
		)
	}

	async function leaveListTaskAsNoProject(task: TaskListItem) {
		await runTaskAction(task.id, () =>
			leaveInboxAsNoProject({
				taskId: task.id,
			}),
		)
	}

	return {
		pendingTaskId,
		updateTaskStatus,
		updateTaskPriority,
		updateTaskDueDate,
		updateTaskProject,
		toggleTaskStatus,
		archiveListTask,
		deleteListTask,
		moveListTaskToInbox,
		leaveListTaskToProject,
		leaveListTaskAsNoProject,
	}
}
