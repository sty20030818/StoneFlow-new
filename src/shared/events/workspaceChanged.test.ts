import { listen } from '@tauri-apps/api/event'
import type * as TauriEvent from '@tauri-apps/api/event'

import {
	normalizeWorkspaceChangedPayload,
	subscribeToWorkspaceChanged,
	WORKSPACE_CHANGED_EVENT,
	type WorkspaceChangedPayload,
} from '@/shared/events/workspaceChanged'

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn<typeof TauriEvent.listen>(),
}))

const mockedListen = vi.mocked(listen)

describe('workspaceChanged event helpers', () => {
	afterEach(() => {
		vi.clearAllMocks()
	})

	it('将 Rust workspace changed 载荷映射为前端字段', () => {
		expect(
			normalizeWorkspaceChangedPayload({
				source: 'sync',
				reason: 'sync',
				changedDomains: ['tasks'],
			}),
		).toEqual({
			source: 'sync',
			reason: 'sync',
			changedDomains: ['tasks'],
		})
	})

	it('忽略不完整 workspace changed 载荷', () => {
		expect(normalizeWorkspaceChangedPayload({ source: 'sync' })).toBeNull()
		expect(
			normalizeWorkspaceChangedPayload({
				source: 'sync',
				reason: 'pull',
				changedDomains: ['unknown'],
			}),
		).toBeNull()
		expect(normalizeWorkspaceChangedPayload(null)).toBeNull()
	})

	it('订阅 workspace changed 并在清理时释放监听', async () => {
		const unlisten = vi.fn<() => void>()
		const onWorkspaceChanged = vi.fn<(payload: WorkspaceChangedPayload) => void>()
		let callback: TauriEvent.EventCallback<unknown> = () => undefined

		mockedListen.mockImplementation(async (_eventName, handler) => {
			callback = handler
			return unlisten
		})

		const cleanup = subscribeToWorkspaceChanged(onWorkspaceChanged)
		await Promise.resolve()

		expect(mockedListen).toHaveBeenCalledWith(WORKSPACE_CHANGED_EVENT, expect.any(Function))

		callback({
			event: WORKSPACE_CHANGED_EVENT,
			id: 1,
			payload: {
				source: 'sync',
				reason: 'pull',
				changedDomains: ['tasks'],
			},
		})

		expect(onWorkspaceChanged).toHaveBeenCalledWith({
			source: 'sync',
			reason: 'pull',
			changedDomains: ['tasks'],
		})

		cleanup()
		expect(unlisten).toHaveBeenCalledTimes(1)
	})
})
