import { invoke } from '@tauri-apps/api/core'
import { getCurrentWindow } from '@tauri-apps/api/window'

export type CreateCaptureTaskCommandInput = {
	title: string
	note?: string | null
	priority?: string | null
}

/**
 * 主 App `create_capture_task` Command 的完整返回 payload。
 * Helper 路径返回的子集会在内部转换时补齐默认值，对上层保持同构。
 */
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

/**
 * Helper `helper_create_task` Command 的精简返回 payload。
 * Helper 不持有数据库，IPC 回传只携带页面真正消费的最小字段。
 */
type HelperCreateTaskResponse = {
	id: string
	title: string
	space_fallback: boolean
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

/** Helper 进程挂载 Quick Capture 面板时使用的 Tauri 窗口 label。 */
const HELPER_WINDOW_LABEL = 'quick-capture'

/**
 * 判断当前前端是运行在 Helper 窗口（需要经 IPC 路径）还是主 App 窗口（直连主 App Command）。
 * Tauri 运行时不可用时（例如浏览器 E2E 调试）返回 false，走主 App 路径。
 */
function isRunningInHelperWindow(): boolean {
	try {
		return getCurrentWindow().label === HELPER_WINDOW_LABEL
	} catch {
		return false
	}
}

function toCreatedPayloadFromMain(payload: CreateCaptureTaskResponse): CreatedCaptureTaskPayload {
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
	}
}

/**
 * Helper 路径的精简 payload → 上层统一 payload。
 * 未随 IPC 回传的字段取合理默认值；页面侧目前只消费 `title` / `spaceFallback`。
 */
function toCreatedPayloadFromHelper(
	payload: HelperCreateTaskResponse,
	input: CreateCaptureTaskCommandInput,
): CreatedCaptureTaskPayload {
	return {
		id: payload.id,
		spaceId: '',
		projectId: null,
		title: payload.title,
		status: 'inbox',
		priority: input.priority?.trim() ? input.priority ?? null : null,
		note: input.note ?? null,
		source: 'quick-capture',
		spaceFallback: payload.space_fallback,
		createdAt: '',
		updatedAt: '',
	}
}

/**
 * 通过 M4-A 共享捕获入口创建 Quick Capture 任务。
 *
 * - 主 App 窗口：直接调用 `create_capture_task`，走内存里的 `application::create::create_capture_task_usecase`。
 * - Helper 窗口：调用 Helper 自注册的 `helper_create_task`，由 Helper 通过 IPC 转发给主 App。
 */
export async function createCaptureTask(input: CreateCaptureTaskCommandInput) {
	const commandInput = {
		title: input.title,
		note: input.note ?? null,
		priority: input.priority?.trim() ? input.priority : null,
	}

	if (isRunningInHelperWindow()) {
		try {
			const payload = await invoke<HelperCreateTaskResponse>('helper_create_task', {
				input: commandInput,
			})
			return toCreatedPayloadFromHelper(payload, input)
		} catch (error) {
			throw normalizeCaptureTaskError(error)
		}
	}

	try {
		const payload = await invoke<CreateCaptureTaskResponse>('create_capture_task', {
			input: commandInput,
		})
		return toCreatedPayloadFromMain(payload)
	} catch (error) {
		throw normalizeCaptureTaskError(error)
	}
}
