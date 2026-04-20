import { invoke } from '@tauri-apps/api/core'

type CreateProjectCommandInput = {
	spaceSlug: string
	name: string
	note?: string | null
}

type CreateProjectResponse = {
	id: string
	space_id: string
	name: string
	status: string
	note: string | null
	sort_order: number
	created_at: string
	updated_at: string
}

export type CreatedProjectPayload = {
	id: string
	spaceId: string
	name: string
	status: string
	note: string | null
	sortOrder: number
	createdAt: string
	updatedAt: string
}

/**
 * 通过 Tauri IPC 创建一个新的 Project。
 */
export async function createProject(input: CreateProjectCommandInput) {
	const payload = await invoke<CreateProjectResponse>('create_project', {
		input: {
			space_slug: input.spaceSlug,
			name: input.name,
			note: input.note ?? null,
		},
	})

	return {
		id: payload.id,
		spaceId: payload.space_id,
		name: payload.name,
		status: payload.status,
		note: payload.note,
		sortOrder: payload.sort_order,
		createdAt: payload.created_at,
		updatedAt: payload.updated_at,
	} satisfies CreatedProjectPayload
}
