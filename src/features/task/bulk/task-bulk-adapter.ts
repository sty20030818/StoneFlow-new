import type { BulkSelectionSnapshot } from '@/features/bulk-action'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import { emitEvent } from '@/shared/events'
import type { TaskDetail, TaskStatus } from '@/shared/types'

import {
	archiveTask as archiveTaskApi,
	deleteTask as deleteTaskApi,
	updateTask as updateTaskApi,
} from '../api/tasks'
import type { TaskPriorityValue } from '../model/taskPriority'

export type TaskBulkMutationReport = {
	requestedIds: string[]
	succeededIds: string[]
	failedIds: string[]
	skippedIds: string[]
}

export type TaskBulkAdapter = {
	complete: (snapshot: BulkSelectionSnapshot) => Promise<TaskBulkMutationReport>
	archive: (ids: string[]) => Promise<TaskBulkMutationReport>
	delete: (ids: string[]) => Promise<TaskBulkMutationReport>
	updatePriority: (ids: string[], priority: TaskPriorityValue) => Promise<TaskBulkMutationReport>
	updateStatus: (ids: string[], status: TaskStatus) => Promise<TaskBulkMutationReport>
	updateDate: (ids: string[], dueAt: string | null) => Promise<TaskBulkMutationReport>
	updatePlacement: (ids: string[], target: TaskPlacementTarget) => Promise<TaskBulkMutationReport>
}

type TaskBulkAdapterOptions = {
	updateTask?: typeof updateTaskApi
	archiveTask?: typeof archiveTaskApi
	deleteTask?: typeof deleteTaskApi
	refreshLoadedSlices: () => Promise<void>
}

export function createTaskBulkAdapter({
	archiveTask = archiveTaskApi,
	deleteTask = deleteTaskApi,
	refreshLoadedSlices,
	updateTask = updateTaskApi,
}: TaskBulkAdapterOptions): TaskBulkAdapter {
	async function runTaskBulkMutation({
		ids,
		lifecycleOperation,
		mutate,
		taskEventType = 'task:updated',
	}: {
		ids: string[]
		mutate: (taskId: string) => Promise<TaskDetail>
		taskEventType?: 'task:updated' | 'task:deleted'
		lifecycleOperation?: 'archive' | 'delete'
	}): Promise<TaskBulkMutationReport> {
		const succeededIds: string[] = []
		const failedIds: string[] = []
		const skippedIds: string[] = []

		for (const taskId of ids) {
			try {
				const detail = await mutate(taskId)
				succeededIds.push(taskId)
				emitEvent({ type: taskEventType, payload: { taskId: detail.id } })
				if (lifecycleOperation) {
					emitEvent({
						type: 'lifecycle:changed',
						payload: {
							entityType: 'task',
							entityId: detail.id,
							operation: lifecycleOperation,
						},
					})
				}
			} catch {
				failedIds.push(taskId)
			}
		}

		if (succeededIds.length > 0) {
			await refreshLoadedSlices()
		}

		return {
			requestedIds: [...ids],
			succeededIds,
			failedIds,
			skippedIds,
		}
	}

	return {
		complete: (snapshot) => {
			const nextStatus = resolveBulkCompleteStatus(snapshot)
			return runTaskBulkMutation({
				ids: snapshot.ids,
				mutate: (taskId) => updateTask({ taskId, status: nextStatus }),
			})
		},
		archive: (ids) =>
			runTaskBulkMutation({
				ids,
				lifecycleOperation: 'archive',
				mutate: archiveTask,
			}),
		delete: (ids) =>
			runTaskBulkMutation({
				ids,
				lifecycleOperation: 'delete',
				mutate: deleteTask,
				taskEventType: 'task:deleted',
			}),
		updatePriority: (ids, priority) =>
			runTaskBulkMutation({
				ids,
				mutate: (taskId) => updateTask({ taskId, priority }),
			}),
		updateStatus: (ids, status) =>
			runTaskBulkMutation({
				ids,
				mutate: (taskId) => updateTask({ taskId, status }),
			}),
		updateDate: (ids, dueAt) =>
			runTaskBulkMutation({
				ids,
				mutate: (taskId) => updateTask({ taskId, dueAt }),
			}),
		updatePlacement: (ids, target) =>
			runTaskBulkMutation({
				ids,
				mutate: (taskId) =>
					updateTask({
						taskId,
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
			}),
	}
}

export function resolveBulkCompleteStatus(snapshot: BulkSelectionSnapshot): TaskStatus {
	const allSelectedTasksAreDone =
		snapshot.entities?.length === snapshot.ids.length &&
		snapshot.entities.every((entity) => entity.status === 'done' || entity.status === 'canceled')

	return allSelectedTasksAreDone ? 'todo' : 'done'
}
