import type { BulkSelectionSnapshot } from '@/features/bulk-action'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import { emitEvent } from '@/shared/events'
import type { TaskStatus } from '@/shared/types'

import { bulkUpdateTasks as bulkUpdateTasksApi, type BulkTaskAction } from '../api/tasks'
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
	bulkUpdateTasks?: typeof bulkUpdateTasksApi
	/** 仅保留到本轮测试迁移完成，生产实现不再读取逐条 mutation。 */
	updateTask?: unknown
	archiveTask?: unknown
	deleteTask?: unknown
	refreshLoadedSlices: () => Promise<void>
}

export function createTaskBulkAdapter({
	bulkUpdateTasks = bulkUpdateTasksApi,
	refreshLoadedSlices,
}: TaskBulkAdapterOptions): TaskBulkAdapter {
	async function runTaskBulkMutation({
		ids,
		action,
		lifecycleOperation,
		taskEventType = 'task:updated',
	}: {
		ids: string[]
		action: BulkTaskAction
		taskEventType?: 'task:updated' | 'task:deleted'
		lifecycleOperation?: 'archive' | 'delete'
	}): Promise<TaskBulkMutationReport> {
		try {
			const result = await bulkUpdateTasks(ids, action)
			for (const taskId of result.taskIds) {
				emitEvent({ type: taskEventType, payload: { taskId } })
				if (lifecycleOperation) {
					emitEvent({
						type: 'lifecycle:changed',
						payload: {
							entityType: 'task',
							entityId: taskId,
							operation: lifecycleOperation,
						},
					})
				}
			}
			await refreshLoadedSlices()
			return { requestedIds: [...ids], succeededIds: result.taskIds, failedIds: [], skippedIds: [] }
		} catch {
			return { requestedIds: [...ids], succeededIds: [], failedIds: [...ids], skippedIds: [] }
		}
	}

	return {
		complete: (snapshot) => {
			const nextStatus = resolveBulkCompleteStatus(snapshot)
			return runTaskBulkMutation({
				ids: snapshot.ids,
				action: { kind: 'setStatus', status: nextStatus },
			})
		},
		archive: (ids) =>
			runTaskBulkMutation({
				ids,
				lifecycleOperation: 'archive',
				action: { kind: 'archive' },
			}),
		delete: (ids) =>
			runTaskBulkMutation({
				ids,
				lifecycleOperation: 'delete',
				action: { kind: 'delete' },
				taskEventType: 'task:deleted',
			}),
		updatePriority: (ids, priority) =>
			runTaskBulkMutation({
				ids,
				action: { kind: 'setPriority', priority },
			}),
		updateStatus: (ids, status) =>
			runTaskBulkMutation({
				ids,
				action: { kind: 'setStatus', status },
			}),
		updateDate: (ids, dueAt) =>
			runTaskBulkMutation({
				ids,
				action: { kind: 'setDueAt', dueAt },
			}),
		updatePlacement: (ids, target) =>
			runTaskBulkMutation({
				ids,
				action: {
					kind: 'setPlacement',
					placement:
						target.kind === 'project'
							? { kind: 'project', spaceId: target.spaceId, projectId: target.projectId }
							: { kind: 'noProject', spaceId: target.spaceId },
				},
			}),
	}
}

export function resolveBulkCompleteStatus(snapshot: BulkSelectionSnapshot): TaskStatus {
	const allSelectedTasksAreDone =
		snapshot.entities?.length === snapshot.ids.length &&
		snapshot.entities.every((entity) => entity.status === 'done' || entity.status === 'canceled')

	return allSelectedTasksAreDone ? 'todo' : 'done'
}
