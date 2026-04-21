import { invoke } from '@tauri-apps/api/core'

import type { OpenedTaskResourceResult } from '@/features/task-drawer/model/types'

type OpenTaskResourceCommandInput = {
	spaceSlug: string
	resourceId: string
}

type OpenTaskResourceResponse = {
	resource_id: string
}

/**
 * 请求系统默认应用打开当前 Resource。
 */
export async function openTaskResource(input: OpenTaskResourceCommandInput) {
	const payload = await invoke<OpenTaskResourceResponse>('open_task_resource', {
		input: {
			space_slug: input.spaceSlug,
			resource_id: input.resourceId,
		},
	})

	return {
		resourceId: payload.resource_id,
	} satisfies OpenedTaskResourceResult
}
