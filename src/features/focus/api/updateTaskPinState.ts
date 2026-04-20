import { invoke } from '@tauri-apps/api/core'

type UpdateTaskPinStateCommandInput = {
	spaceSlug: string
	taskId: string
	pinned: boolean
}

type UpdateTaskPinStateResponse = {
	task_id: string
	pinned: boolean
	updated_at: string
}

export type UpdatedTaskPinStatePayload = {
	taskId: string
	pinned: boolean
	updatedAt: string
}

/**
 * 更新 Task 的 pin 状态。
 */
export async function updateTaskPinState(input: UpdateTaskPinStateCommandInput) {
	const payload = await invoke<UpdateTaskPinStateResponse>('update_task_pin_state', {
		input: {
			space_slug: input.spaceSlug,
			task_id: input.taskId,
			pinned: input.pinned,
		},
	})

	return {
		taskId: payload.task_id,
		pinned: payload.pinned,
		updatedAt: payload.updated_at,
	} satisfies UpdatedTaskPinStatePayload
}
