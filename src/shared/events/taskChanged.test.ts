import { listen } from '@tauri-apps/api/event'
import { renderHook } from '@testing-library/react'
import type * as TauriEvent from '@tauri-apps/api/event'

import {
	isTaskChangedForSpace,
	normalizeTaskChangedPayload,
	subscribeToTaskChanged,
	TASKS_CHANGED_EVENT,
	type TaskChangedPayload,
	useTaskChangedListener,
} from '@/shared/events/taskChanged'

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn<typeof TauriEvent.listen>(),
}))

const mockedListen = vi.mocked(listen)

describe('taskChanged event helpers', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('将 Rust snake_case 事件载荷映射为前端字段', () => {
		const payload = normalizeTaskChangedPayload({
			space_id: 'space-uuid',
			space_slug: 'work',
			task_id: 'task-uuid',
			source: 'quick_capture',
			space_fallback: false,
		})

		expect(payload).toEqual({
			spaceId: 'space-uuid',
			spaceSlug: 'work',
			taskId: 'task-uuid',
			source: 'quick_capture',
			spaceFallback: false,
		})
		expect(payload ? isTaskChangedForSpace(payload, 'work') : false).toBe(true)
		expect(payload ? isTaskChangedForSpace(payload, 'other') : true).toBe(false)
	})

	it('忽略不完整事件载荷', () => {
		expect(normalizeTaskChangedPayload({ task_id: 'task-uuid' })).toBeNull()
		expect(normalizeTaskChangedPayload(null)).toBeNull()
	})

	it('订阅任务变更并在清理时释放监听', async () => {
		const unlisten = vi.fn<() => void>()
		const onTaskChanged = vi.fn<(payload: TaskChangedPayload) => void>()
		let callback: TauriEvent.EventCallback<unknown> = () => undefined

		mockedListen.mockImplementation(async (_eventName, handler) => {
			callback = handler
			return unlisten
		})

		const cleanup = subscribeToTaskChanged(onTaskChanged)
		await Promise.resolve()

		expect(mockedListen).toHaveBeenCalledWith(TASKS_CHANGED_EVENT, expect.any(Function))

		callback({
			event: TASKS_CHANGED_EVENT,
			id: 1,
			payload: {
				space_id: 'space-uuid',
				space_slug: 'work',
				task_id: 'task-uuid',
				source: 'quick_capture',
				space_fallback: true,
			},
		})

		expect(onTaskChanged).toHaveBeenCalledWith(
			expect.objectContaining({
				spaceSlug: 'work',
				taskId: 'task-uuid',
				spaceFallback: true,
			}),
		)

		cleanup()
		expect(unlisten).toHaveBeenCalledTimes(1)
	})

	it('hook 只响应当前 Space 的任务变更', async () => {
		const unlisten = vi.fn<() => void>()
		const onTaskChanged = vi.fn<(payload: TaskChangedPayload) => void>()
		let callback: TauriEvent.EventCallback<unknown> = () => undefined

		mockedListen.mockImplementation(async (_eventName, handler) => {
			callback = handler
			return unlisten
		})

		const { unmount } = renderHook(() => useTaskChangedListener('work', onTaskChanged))
		await Promise.resolve()

		callback({
			event: TASKS_CHANGED_EVENT,
			id: 1,
			payload: {
				space_id: 'space-other',
				space_slug: 'other',
				task_id: 'task-other',
				source: 'quick_capture',
				space_fallback: false,
			},
		})
		callback({
			event: TASKS_CHANGED_EVENT,
			id: 2,
			payload: {
				space_id: 'space-default',
				space_slug: 'work',
				task_id: 'task-default',
				source: 'quick_capture',
				space_fallback: false,
			},
		})

		expect(onTaskChanged).toHaveBeenCalledTimes(1)
		expect(onTaskChanged).toHaveBeenCalledWith(
			expect.objectContaining({
				spaceSlug: 'work',
				taskId: 'task-default',
			}),
		)

		unmount()
		expect(unlisten).toHaveBeenCalledTimes(1)
	})
})
