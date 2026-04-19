import { invoke } from '@tauri-apps/api/core'

import type { DeletedTaskResult } from '@/features/task-drawer/model/types'

type DeleteTaskToTrashCommandInput = {
	spaceSlug: string
	taskId: string
}

type DeletedTaskResponse = {
	task_id: string
	deleted_at: string
}

/**
 * 将当前 Task 软删除到 Trash。
 */
export async function deleteTaskToTrash(input: DeleteTaskToTrashCommandInput) {
	const payload = await invoke<DeletedTaskResponse>('delete_task_to_trash', {
		input: {
			space_slug: input.spaceSlug,
			task_id: input.taskId,
		},
	})

	return {
		taskId: payload.task_id,
		deletedAt: payload.deleted_at,
	} satisfies DeletedTaskResult
}
