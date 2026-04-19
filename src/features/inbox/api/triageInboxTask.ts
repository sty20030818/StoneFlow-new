import { invoke } from '@tauri-apps/api/core'

type TriageInboxTaskCommandInput = {
	spaceSlug: string
	taskId: string
	projectId?: string | null
	priority?: string | null
}

type TriageInboxTaskResponse = {
	task_id: string
	project_id: string | null
	priority: string | null
	status: string
	remains_in_inbox: boolean
	updated_at: string
}

export type TriageInboxTaskPayload = {
	taskId: string
	projectId: string | null
	priority: string | null
	status: string
	remainsInInbox: boolean
	updatedAt: string
}

/**
 * 对单个 Inbox Task 进行最小整理。
 */
export async function triageInboxTask(input: TriageInboxTaskCommandInput) {
	const payload = await invoke<TriageInboxTaskResponse>('triage_inbox_task', {
		input: {
			space_slug: input.spaceSlug,
			task_id: input.taskId,
			project_id: input.projectId ?? null,
			priority: input.priority ?? null,
		},
	})

	return {
		taskId: payload.task_id,
		projectId: payload.project_id,
		priority: payload.priority,
		status: payload.status,
		remainsInInbox: payload.remains_in_inbox,
		updatedAt: payload.updated_at,
	} satisfies TriageInboxTaskPayload
}
