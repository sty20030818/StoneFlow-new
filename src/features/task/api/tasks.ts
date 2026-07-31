/**
 * 任务实体 Tauri IO（list / detail / create / update / archive / restore / delete）。
 *
 * 仅本文件与同夹其它 api 允许 `invoke`；UI 与 hooks 不得直接 invoke。
 */

import { invoke } from '@tauri-apps/api/core'

import type {
	CreateTaskInput,
	ListTasksInput,
	ListTasksPage,
	TaskDetail,
	TaskListViewKey,
	TaskUpdatePlacementInput,
	UpdateTaskInput,
} from '@/shared/types'
import type { Scope } from '@/shared/types'

export type BulkTaskAction =
	| { kind: 'archive' }
	| { kind: 'delete' }
	| { kind: 'setPriority'; priority: number }
	| { kind: 'setStatus'; status: 'todo' | 'doing' | 'waiting' | 'done' | 'canceled' }
	| { kind: 'setDueAt'; dueAt: string | null }
	| {
			kind: 'setPlacement'
			placement: TaskUpdatePlacementInput
	  }

type TaskScopePayload =
	| {
			type: 'all'
	  }
	| {
			type: 'space'
			spaceId: string
	  }

function toScopePayload(scope: Scope): TaskScopePayload {
	return scope.type === 'all' ? { type: 'all' } : { type: 'space', spaceId: scope.spaceId }
}

export async function listTasks(input: ListTasksInput): Promise<ListTasksPage> {
	const page = await invoke<{
		items: ListTasksPage['items']
		nextCursor?: string | null
		totalCount?: number
	}>('list_tasks', {
		input: {
			scope: toScopePayload(input.scope),
			viewKey: input.viewKey,
			placement: {
				kind: input.placement.kind,
				projectId: input.placement.kind === 'project' ? input.placement.projectId : null,
			},
			statuses: input.statuses ?? null,
			limit: input.limit ?? null,
			cursor: input.cursor ?? null,
		},
	})
	// totalCount 为契约必填；缺省视为实现错误，不回退 items.length（会随续拉假增长拇指）
	if (typeof page.totalCount !== 'number') {
		throw new Error('list_tasks 响应缺少 totalCount')
	}
	return {
		items: page.items,
		nextCursor: page.nextCursor ?? null,
		totalCount: page.totalCount,
	}
}

export async function getTaskDetail(taskId: string) {
	return invoke<TaskDetail>('get_task_detail', {
		input: { taskId },
	})
}

export async function createTask(input: CreateTaskInput) {
	return invoke<TaskDetail>('create_task', {
		input: {
			spaceId: input.spaceId ?? null,
			placement: {
				kind: input.placement.kind,
				projectId: input.placement.kind === 'project' ? input.placement.projectId : null,
			},
			title: input.title,
			note: input.note ?? null,
			status: input.status ?? null,
			priority: input.priority ?? null,
			dueAt: input.dueAt ?? null,
			plannedAt: input.plannedAt ?? null,
			remindAt: input.remindAt ?? null,
		},
	})
}

export async function updateTask(input: UpdateTaskInput) {
	return invoke<TaskDetail>('update_task', {
		input: {
			taskId: input.taskId,
			title: input.title,
			note: input.note,
			status: input.status,
			priority: input.priority,
			placement: input.placement
				? {
						kind: input.placement.kind,
						spaceId: input.placement.spaceId,
						projectId: input.placement.kind === 'project' ? input.placement.projectId : null,
					}
				: undefined,
			dueAt: input.dueAt,
			plannedAt: input.plannedAt,
			remindAt: input.remindAt,
			...(input.position === undefined ? {} : { position: input.position }),
		},
	})
}

export async function bulkUpdateTasks(taskIds: string[], action: BulkTaskAction) {
	return invoke<{ taskIds: string[]; operationId: string }>('bulk_update_tasks', {
		input: { taskIds, action },
	})
}

export async function archiveTask(taskId: string) {
	return invoke<TaskDetail>('archive_task', {
		input: { taskId },
	})
}

export async function restoreTask(taskId: string) {
	return invoke<TaskDetail>('restore_task', {
		input: { taskId },
	})
}

export async function deleteTask(taskId: string) {
	return invoke<TaskDetail>('delete_task', {
		input: { taskId },
	})
}

export function getDefaultTaskViewKey(): TaskListViewKey {
	return 'active'
}
