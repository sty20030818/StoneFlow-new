import { invoke } from '@tauri-apps/api/core'

import { mapTaskResource } from '@/features/task-drawer/api/listTaskResources'
import type {
	CreatedTaskResourceResult,
	TaskDrawerResourceType,
} from '@/features/task-drawer/model/types'

type CreateTaskResourceCommandInput = {
	spaceSlug: string
	taskId: string
	type: TaskDrawerResourceType
	title: string
	target: string
}

type CreateTaskResourceResponse = {
	resource: Parameters<typeof mapTaskResource>[0]
}

/**
 * 为当前 Task 创建一个 Resource 挂载。
 */
export async function createTaskResource(input: CreateTaskResourceCommandInput) {
	const payload = await invoke<CreateTaskResourceResponse>('create_task_resource', {
		input: {
			space_slug: input.spaceSlug,
			task_id: input.taskId,
			type: input.type,
			title: input.title,
			target: input.target,
		},
	})

	return {
		resource: mapTaskResource(payload.resource),
	} satisfies CreatedTaskResourceResult
}
