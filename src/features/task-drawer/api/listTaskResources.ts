import { invoke } from '@tauri-apps/api/core'

import type { TaskDrawerResource } from '@/features/task-drawer/model/types'

type ListTaskResourcesCommandInput = {
	spaceSlug: string
	taskId: string
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

type TaskResourceListResponse = {
	resources: TaskDrawerResourceResponse[]
}

/**
 * 查询当前 Task 下挂载的 Resource 列表。
 */
export async function listTaskResources(input: ListTaskResourcesCommandInput) {
	const payload = await invoke<TaskResourceListResponse>('list_task_resources', {
		input: {
			space_slug: input.spaceSlug,
			task_id: input.taskId,
		},
	})

	return payload.resources.map(mapTaskResource)
}

export function mapTaskResource(resource: TaskDrawerResourceResponse): TaskDrawerResource {
	return {
		id: resource.id,
		taskId: resource.task_id,
		type: resource.type,
		title: resource.title,
		target: resource.target,
		sortOrder: resource.sort_order,
		createdAt: resource.created_at,
		updatedAt: resource.updated_at,
	}
}
