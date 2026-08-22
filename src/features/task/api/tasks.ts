/**
 * 任务实体 Tauri IO（list / detail / create / update / archive / restore / delete）。
 *
 * 仅本文件与同夹其它 api 允许 `invoke`；UI 与 hooks 不得直接 invoke。
 */

import { invoke } from '@tauri-apps/api/core'

import type {
	CountTaskQueryInput,
	CreateTaskInput,
	RunTaskQueryInput,
	RunTaskQueryResult,
	TaskDetail,
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

export async function runTaskQuery(input: RunTaskQueryInput): Promise<RunTaskQueryResult> {
	const page = await invoke<RunTaskQueryResult>('run_task_query', {
		input: {
			scope: toScopePayload(input.scope),
			context: input.context,
			baseViewKey: input.baseViewKey,
			filters: input.filters,
			cursor: input.cursor ?? null,
		},
	})
	if (input.cursor == null && typeof page.totalCount !== 'number') {
		throw new Error('run_task_query 响应缺少 totalCount')
	}
	if (page.totalCount != null && typeof page.totalCount !== 'number') {
		throw new Error('run_task_query 响应包含无效 totalCount')
	}
	return {
		items: page.items,
		nextCursor: page.nextCursor ?? null,
		totalCount: page.totalCount ?? null,
	}
}

export async function countTaskQuery(input: CountTaskQueryInput): Promise<number> {
	const result = await invoke<{ totalCount?: unknown }>('count_task_query', {
		input: {
			scope: toScopePayload(input.scope),
			context: input.context,
			baseViewKey: input.baseViewKey,
			filters: input.filters,
		},
	})
	if (typeof result.totalCount !== 'number') {
		throw new Error('count_task_query 响应缺少 totalCount')
	}
	return result.totalCount
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
