import { act, renderHook, waitFor } from '@testing-library/react'
import { listen } from '@tauri-apps/api/event'
import type * as TauriEvent from '@tauri-apps/api/event'

import { getSyncStatus, runSync } from '@/features/sync/api/sync'

import { useSyncStatusController } from './useSyncStatusController'

vi.mock('@/features/sync/api/sync', () => ({
	getSyncStatus: vi.fn(() =>
		Promise.resolve({
			enabled: true,
			status: 'synced',
			lastPushAt: null,
			lastPullAt: null,
			lastError: null,
			lastErrorMode: null,
			dirtySince: null,
			pendingResync: false,
			hasRemoteConfig: true,
			remoteUrl: 'postgresql://user:***@db.example.com/sf',
			replicaState: 'ready',
			replicaReason: null,
			lastRestoreAt: null,
			policyMode: 'interval',
			policyIntervalMinutes: 15,
			nextSyncAt: null,
		}),
	),
	runSync: vi.fn(),
}))
vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn<typeof TauriEvent.listen>(),
}))

const mockedGetSyncStatus = vi.mocked(getSyncStatus)
const mockedRunSync = vi.mocked(runSync)
const mockedListen = vi.mocked(listen)

describe('useSyncStatusController', () => {
	beforeEach(() => {
		mockedGetSyncStatus.mockClear()
		mockedListen.mockImplementation(async () => vi.fn<() => void>())
	})

	afterEach(() => {
		mockedRunSync.mockReset()
		vi.restoreAllMocks()
	})

	it('手动同步成功后刷新同步状态', async () => {
		mockedRunSync.mockResolvedValue({
			enabled: true,
			status: 'synced',
			lastPushAt: '2026-06-26T00:00:00Z',
			lastPullAt: '2026-06-26T00:00:00Z',
			lastError: null,
			lastErrorMode: null,
			dirtySince: null,
			pendingResync: false,
			hasRemoteConfig: true,
			remoteUrl: 'postgresql://user:***@db.example.com/sf',
			replicaState: 'ready',
			replicaReason: null,
			lastRestoreAt: null,
			policyMode: 'interval',
			policyIntervalMinutes: 15,
			nextSyncAt: null,
		})

		const { result } = renderHook(() => useSyncStatusController())

		await act(async () => {
			await result.current.runNow()
		})

		await waitFor(() => {
			expect(result.current.displayedStatus).toBe('synced')
		})
	})

	it('手动同步失败时不通知工作区刷新', async () => {
		mockedRunSync.mockRejectedValue(new Error('sync failed'))

		const { result } = renderHook(() => useSyncStatusController())

		await act(async () => {
			await result.current.runNow()
		})

		await waitFor(() => {
			expect(result.current.message).toBe('sync failed')
		})
	})

	it('收到同步状态事件后刷新状态', async () => {
		let callback: TauriEvent.EventCallback<unknown> = () => undefined
		mockedListen.mockImplementation(async (_eventName, handler) => {
			callback = handler
			return vi.fn<() => void>()
		})

		renderHook(() => useSyncStatusController())
		await waitFor(() => {
			expect(mockedListen).toHaveBeenCalledWith(
				'stoneflow://sync/status-changed',
				expect.any(Function),
			)
		})

		act(() => {
			callback({
				event: 'stoneflow://sync/status-changed',
				id: 1,
				payload: { source: 'sync', reason: 'completed' },
			})
		})

		await waitFor(() => {
			expect(mockedGetSyncStatus).toHaveBeenCalledTimes(2)
		})
	})

	it('兜底轮询使用 60 秒间隔', async () => {
		const setIntervalSpy = vi.spyOn(window, 'setInterval')

		const { unmount } = renderHook(() => useSyncStatusController())

		await waitFor(() => {
			expect(setIntervalSpy.mock.calls.some((call) => call[1] === 60_000)).toBe(true)
		})
		unmount()
	})
})
