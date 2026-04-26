import { invoke } from '@tauri-apps/api/core'

import type { ProjectTaskStatus } from '@/features/project/model/types'

type CreateTaskCommandInput = {
	spaceSlug: string
	title: string
	note?: string | null
	priority?: string | null
	projectId?: string | null
	status?: ProjectTaskStatus
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
	space_fallback: boolean
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
	spaceFallback: boolean
	createdAt: string
	updatedAt: string
}

export type TaskCreateErrorType =
	| 'Validation'
	| 'NotFound'
	| 'Forbidden'
	| 'Conflict'
	| 'Internal'
	| 'CaptureSpaceUnavailable'
	| 'DefaultSpaceUnavailable'
	| 'CapturePersistence'

export type TaskCreateErrorPayload = {
	type: TaskCreateErrorType
	message: string
}

export class TaskCreateError extends Error {
	readonly type: TaskCreateErrorType

	constructor(payload: TaskCreateErrorPayload) {
		super(payload.message)
		this.name = 'TaskCreateError'
		this.type = payload.type
	}
}

function isTaskCreateErrorPayload(error: unknown): error is TaskCreateErrorPayload {
	if (!error || typeof error !== 'object') {
		return false
	}

	const candidate = error as Partial<TaskCreateErrorPayload>
	return typeof candidate.type === 'string' && typeof candidate.message === 'string'
}

export function normalizeTaskCreateError(error: unknown) {
	if (isTaskCreateErrorPayload(error)) {
		return new TaskCreateError(error)
	}

	if (error instanceof Error) {
		return error
	}

	return new Error('创建任务失败，请稍后重试。')
}

/**
 * 通过 Tauri IPC 创建一个新的 Task。
 */
export async function createTask(input: CreateTaskCommandInput) {
	let payload: CreateTaskResponse

	try {
		payload = await invoke<CreateTaskResponse>('create_task', {
			input: {
				space_slug: input.spaceSlug,
				title: input.title,
				note: input.note ?? null,
				priority: input.priority?.trim() ? input.priority : null,
				project_id: input.projectId?.trim() ? input.projectId : null,
				status: input.status ?? 'todo',
			},
		})
	} catch (error) {
		throw normalizeTaskCreateError(error)
	}

	return {
		id: payload.id,
		spaceId: payload.space_id,
		projectId: payload.project_id,
		title: payload.title,
		status: payload.status,
		priority: payload.priority,
		note: payload.note,
		source: payload.source,
		spaceFallback: payload.space_fallback,
		createdAt: payload.created_at,
		updatedAt: payload.updated_at,
	} satisfies CreatedTaskPayload
}
