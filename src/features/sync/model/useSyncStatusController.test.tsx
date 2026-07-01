import { act, renderHook, waitFor } from '@testing-library/react'

import { runSync } from '@/features/sync/api/sync'

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
			remoteUrl: 'libsql://example.turso.io',
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

const mockedRunSync = vi.mocked(runSync)

describe('useSyncStatusController', () => {
	afterEach(() => {
		mockedRunSync.mockReset()
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
			remoteUrl: 'libsql://example.turso.io',
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
})
