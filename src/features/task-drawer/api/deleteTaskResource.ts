import { invoke } from '@tauri-apps/api/core'

import type { DeletedTaskResourceResult } from '@/features/task-drawer/model/types'

type DeleteTaskResourceCommandInput = {
	spaceSlug: string
	resourceId: string
}

type DeleteTaskResourceResponse = {
	resource_id: string
}

/**
 * 删除当前 Task 下的 Resource 挂载。Resource 不进入 Trash。
 */
export async function deleteTaskResource(input: DeleteTaskResourceCommandInput) {
	const payload = await invoke<DeleteTaskResourceResponse>('delete_task_resource', {
		input: {
			space_slug: input.spaceSlug,
			resource_id: input.resourceId,
		},
	})

	return {
		resourceId: payload.resource_id,
	} satisfies DeletedTaskResourceResult
}
