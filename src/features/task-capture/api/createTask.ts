import { invoke } from '@tauri-apps/api/core'

type CreateTaskCommandInput = {
	spaceSlug: string
	title: string
	note?: string | null
	projectId?: string | null
}

type CreateTaskResponse = {
	id: string
	space_id: string
	project_id: string | null
	title: string
	status: string
	priority: string | null
	note: string | null
	source: string
	created_at: string
	updated_at: string
}

export type CreatedTaskPayload = {
	id: string
	spaceId: string
	projectId: string | null
	title: string
	status: string
	priority: string | null
	note: string | null
	source: string
	createdAt: string
	updatedAt: string
}

/**
 * 通过 Tauri IPC 创建一个新的 Task。
 */
export async function createTask(input: CreateTaskCommandInput) {
	const payload = await invoke<CreateTaskResponse>('create_task', {
		input: {
			space_slug: input.spaceSlug,
			title: input.title,
			note: input.note ?? null,
			project_id: input.projectId ?? null,
		},
	})

	return {
		id: payload.id,
		spaceId: payload.space_id,
		projectId: payload.project_id,
		title: payload.title,
		status: payload.status,
		priority: payload.priority,
		note: payload.note,
		source: payload.source,
		createdAt: payload.created_at,
		updatedAt: payload.updated_at,
	} satisfies CreatedTaskPayload
}
