import { invoke } from '@tauri-apps/api/core'

import type {
	CreateTaskLinkInput,
	DeleteTaskLinkInput,
	ListTaskLinksInput,
	TaskLink,
	UpdateTaskLinkInput,
} from '@/shared/types'

export async function listTaskLinks(input: ListTaskLinksInput) {
	return invoke<TaskLink[]>('list_task_links', {
		input: {
			taskId: input.taskId,
		},
	})
}

export async function createTaskLink(input: CreateTaskLinkInput) {
	return invoke<TaskLink>('create_task_link', {
		input: {
			taskId: input.taskId,
			title: input.title,
			url: input.url,
		},
	})
}

export async function updateTaskLink(input: UpdateTaskLinkInput) {
	return invoke<TaskLink>('update_task_link', {
		input: {
			linkId: input.linkId,
			title: input.title,
			url: input.url,
		},
	})
}

export async function deleteTaskLink(input: DeleteTaskLinkInput) {
	return invoke<TaskLink>('delete_task_link', {
		input: {
			linkId: input.linkId,
		},
	})
}
