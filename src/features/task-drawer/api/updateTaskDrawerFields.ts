import { invoke } from '@tauri-apps/api/core'

import type { TaskDrawerTask, TaskDrawerStatus } from '@/features/task-drawer/model/types'

type UpdateTaskDrawerFieldsCommandInput = {
	spaceSlug: string
	taskId: string
	title: string
	note: string
	priority: string
	projectId: string
	status: TaskDrawerStatus
}

type TaskDrawerTaskResponse = {
	id: string
	title: string
	note: string | null
	priority: string | null
	project_id: string | null
	status: TaskDrawerStatus
	created_at: string
	updated_at: string
	completed_at: string | null
}

type UpdatedTaskDrawerResponse = {
	task: TaskDrawerTaskResponse
}

/**
 * 保存 Task Drawer 的基础字段编辑。
 */
export async function updateTaskDrawerFields(input: UpdateTaskDrawerFieldsCommandInput) {
	const payload = await invoke<UpdatedTaskDrawerResponse>('update_task_drawer_fields', {
		input: {
			space_slug: input.spaceSlug,
			task_id: input.taskId,
			title: input.title,
			note: input.note,
			priority: input.priority || null,
			project_id: input.projectId || null,
			status: input.status,
		},
	})

	return {
		id: payload.task.id,
		title: payload.task.title,
		note: payload.task.note,
		priority: payload.task.priority,
		projectId: payload.task.project_id,
		status: payload.task.status,
		createdAt: payload.task.created_at,
		updatedAt: payload.task.updated_at,
		completedAt: payload.task.completed_at,
	} satisfies TaskDrawerTask
}
