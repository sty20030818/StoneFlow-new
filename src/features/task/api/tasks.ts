import { invoke } from '@tauri-apps/api/core'

import type {
	CreateTaskInput,
	ListTasksInput,
	TaskDetail,
	TaskListItem,
	TaskListViewKey,
	UpdateTaskInput,
} from '@/shared/types'
import type { Scope } from '@/shared/types'

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

export async function listTasks(input: ListTasksInput) {
	return invoke<TaskListItem[]>('list_tasks', {
		input: {
			scope: toScopePayload(input.scope),
			viewKey: input.viewKey,
			projectId: input.projectId ?? null,
		},
	})
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
			projectId: input.projectId ?? null,
			title: input.title,
			note: input.note ?? null,
			status: input.status ?? null,
			priority: input.priority ?? null,
			dueAt: input.dueAt ?? null,
			scheduledAt: input.scheduledAt ?? null,
			reminderAt: input.reminderAt ?? null,
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
			spaceId: input.spaceId,
			projectId: input.projectId,
			dueAt: input.dueAt,
			scheduledAt: input.scheduledAt,
			reminderAt: input.reminderAt,
		},
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
