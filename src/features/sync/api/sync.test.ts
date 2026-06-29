import { invoke } from '@tauri-apps/api/core'

import {
	configureSync,
	getSyncDiagnostics,
	getSyncStatus,
	restoreSync,
	runSync,
} from '@/features/sync/api/sync'

vi.mock('@tauri-apps/api/core', () => ({
	invoke: vi.fn<(cmd: string, args?: Record<string, unknown>) => Promise<unknown>>(),
}))

const mockedInvoke = invoke as unknown as ReturnType<typeof vi.fn>

describe('sync api', () => {
	afterEach(() => {
		mockedInvoke.mockReset()
	})

	it('读取同步状态时调用 get_sync_status', async () => {
		mockedInvoke.mockResolvedValue({
			enabled: false,
			status: 'disabled',
			lastPushAt: null,
			lastPullAt: null,
			lastError: null,
			lastErrorMode: null,
			dirtySince: null,
			pendingResync: false,
			hasRemoteConfig: false,
			remoteUrl: null,
			replicaState: 'uninitialized',
			replicaReason: null,
			lastRestoreAt: null,
		})

		await getSyncStatus()

		expect(mockedInvoke).toHaveBeenCalledWith('get_sync_status')
	})

	it('保存配置时发送 camelCase 输入', async () => {
		mockedInvoke.mockResolvedValue({
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
		})

		await configureSync({
			url: 'libsql://example.turso.io',
			token: 'secret',
		})

		expect(mockedInvoke).toHaveBeenCalledWith('configure_sync', {
			input: {
				url: 'libsql://example.turso.io',
				token: 'secret',
			},
		})
	})

	it('读取同步诊断时调用 get_sync_diagnostics', async () => {
		mockedInvoke.mockResolvedValue({
			remoteHost: 'libsql://example.turso.io',
			local: {
				deviceId: 'device-1',
				lastPulledRemoteCursor: 12,
				lastRestoreAt: '2026-06-28T00:00:00Z',
				pendingOutboxCount: 1,
				counts: {
					spaces: 2,
					projects: 3,
					tasks: 8,
					taskLinks: 1,
					views: 4,
					settings: 2,
					totalItems: 20,
				},
			},
			remote: {
				latestRemoteCursor: 15,
				counts: {
					spaces: 2,
					projects: 3,
					tasks: 8,
					taskLinks: 1,
					views: 4,
					settings: 2,
					totalItems: 20,
				},
			},
		})

		await getSyncDiagnostics()

		expect(mockedInvoke).toHaveBeenCalledWith('get_sync_diagnostics')
	})

	it('手动同步时调用 run_sync', async () => {
		mockedInvoke.mockResolvedValue({
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
		})

		await runSync()

		expect(mockedInvoke).toHaveBeenCalledWith('run_sync')
	})

	it('恢复本地副本时调用 restore_sync', async () => {
		mockedInvoke.mockResolvedValue({
			status: {
				enabled: true,
				status: 'synced',
				lastPushAt: null,
				lastPullAt: '2026-06-28T00:00:00Z',
				lastError: null,
				lastErrorMode: null,
				dirtySince: null,
				pendingResync: false,
				hasRemoteConfig: true,
				remoteUrl: 'libsql://example.turso.io',
				replicaState: 'ready',
				replicaReason: null,
				lastRestoreAt: '2026-06-28T00:00:00Z',
			},
			summary: {
				spaces: 2,
				projects: 3,
				tasks: 8,
				taskLinks: 1,
				views: 4,
				settings: 2,
				totalItems: 20,
			},
		})

		await restoreSync()

		expect(mockedInvoke).toHaveBeenCalledWith('restore_sync')
	})
})
