import { invoke } from '@tauri-apps/api/core'

import type { TaskDrawerDetail } from '@/features/task-drawer/model/types'

type GetTaskDrawerDetailCommandInput = {
	spaceSlug: string
	taskId: string
}

type TaskDrawerProjectOptionResponse = {
	id: string
	name: string
	sort_order: number
}

type TaskDrawerTaskResponse = {
	id: string
	title: string
	note: string | null
	priority: string | null
	project_id: string | null
	status: 'todo' | 'done'
	created_at: string
	updated_at: string
	completed_at: string | null
}

type TaskDrawerResourceResponse = {
	id: string
	task_id: string
	type: 'doc_link' | 'local_file' | 'local_folder'
	title: string
	target: string
	sort_order: number
	created_at: string
	updated_at: string
}

type TaskDrawerDetailResponse = {
	task: TaskDrawerTaskResponse
	projects: TaskDrawerProjectOptionResponse[]
	resources: TaskDrawerResourceResponse[]
}

/**
 * 查询单个 Task Drawer 的真实详情。
 */
export async function getTaskDrawerDetail(input: GetTaskDrawerDetailCommandInput) {
	const payload = await invoke<TaskDrawerDetailResponse>('get_task_drawer_detail', {
		input: {
			space_slug: input.spaceSlug,
			task_id: input.taskId,
		},
	})

	return {
		task: {
			id: payload.task.id,
			title: payload.task.title,
			note: payload.task.note,
			priority: payload.task.priority,
			projectId: payload.task.project_id,
			status: payload.task.status,
			createdAt: payload.task.created_at,
			updatedAt: payload.task.updated_at,
			completedAt: payload.task.completed_at,
		},
		projects: payload.projects.map((project) => ({
			id: project.id,
			name: project.name,
			sortOrder: project.sort_order,
		})),
		resources: payload.resources.map((resource) => ({
			id: resource.id,
			taskId: resource.task_id,
			type: resource.type,
			title: resource.title,
			target: resource.target,
			sortOrder: resource.sort_order,
			createdAt: resource.created_at,
			updatedAt: resource.updated_at,
		})),
	} satisfies TaskDrawerDetail
}
