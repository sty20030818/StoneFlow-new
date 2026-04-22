import { invoke } from '@tauri-apps/api/core'

export type CreateCaptureTaskCommandInput = {
	title: string
	note?: string | null
	priority?: string | null
}

type CreateCaptureTaskResponse = {
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

export type CreatedCaptureTaskPayload = {
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

export type CaptureTaskErrorType =
	| 'Validation'
	| 'NotFound'
	| 'Forbidden'
	| 'Conflict'
	| 'Internal'
	| 'CaptureSpaceUnavailable'
	| 'DefaultSpaceUnavailable'
	| 'CapturePersistence'

export type CaptureTaskErrorPayload = {
	type: CaptureTaskErrorType
	message: string
}

export class CaptureTaskError extends Error {
	readonly type: CaptureTaskErrorType

	constructor(payload: CaptureTaskErrorPayload) {
		super(payload.message)
		this.name = 'CaptureTaskError'
		this.type = payload.type
	}
}

function isCaptureTaskErrorPayload(error: unknown): error is CaptureTaskErrorPayload {
	if (!error || typeof error !== 'object') {
		return false
	}

	const candidate = error as Partial<CaptureTaskErrorPayload>
	return typeof candidate.type === 'string' && typeof candidate.message === 'string'
}

export function normalizeCaptureTaskError(error: unknown) {
	if (isCaptureTaskErrorPayload(error)) {
		return new CaptureTaskError(error)
	}

	if (error instanceof Error) {
		return error
	}

	return new Error('捕获失败，请稍后重试。')
}

/**
 * 通过 M4-A 共享捕获入口创建 Quick Capture 任务。
 */
export async function createCaptureTask(input: CreateCaptureTaskCommandInput) {
	let payload: CreateCaptureTaskResponse

	try {
		payload = await invoke<CreateCaptureTaskResponse>('create_capture_task', {
			input: {
				title: input.title,
				note: input.note ?? null,
				priority: input.priority?.trim() ? input.priority : null,
			},
		})
	} catch (error) {
		throw normalizeCaptureTaskError(error)
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
	} satisfies CreatedCaptureTaskPayload
}
