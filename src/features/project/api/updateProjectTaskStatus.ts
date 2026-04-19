import { invoke } from '@tauri-apps/api/core'

import type { ProjectTaskStatus } from '@/features/project/model/types'

type UpdateProjectTaskStatusCommandInput = {
	spaceSlug: string
	projectId: string
	taskId: string
	status: ProjectTaskStatus
}

type UpdateProjectTaskStatusResponse = {
	task_id: string
	status: ProjectTaskStatus
	completed_at: string | null
	updated_at: string
}

export type UpdatedProjectTaskStatusPayload = {
	taskId: string
	status: ProjectTaskStatus
	completedAt: string | null
	updatedAt: string
}

/**
 * 更新 Project 任务的 todo / done 状态。
 */
export async function updateProjectTaskStatus(input: UpdateProjectTaskStatusCommandInput) {
	const payload = await invoke<UpdateProjectTaskStatusResponse>('update_project_task_status', {
		input: {
			space_slug: input.spaceSlug,
			project_id: input.projectId,
			task_id: input.taskId,
			status: input.status,
		},
	})

	return {
		taskId: payload.task_id,
		status: payload.status,
		completedAt: payload.completed_at,
		updatedAt: payload.updated_at,
	} satisfies UpdatedProjectTaskStatusPayload
}
