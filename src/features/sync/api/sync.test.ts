import { invoke } from '@tauri-apps/api/core'

import { configureSync, forceSync, getSyncStatus } from '@/features/sync/api/sync'

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
			remoteToken: null,
		})

		await getSyncStatus()

		expect(mockedInvoke).toHaveBeenCalledWith('get_sync_status')
	})

	it('保存配置时发送 camelCase 输入', async () => {
		mockedInvoke.mockResolvedValue({
			enabled: true,
			status: 'idle',
			lastPushAt: null,
			lastPullAt: null,
			lastError: null,
			lastErrorMode: null,
			dirtySince: null,
			pendingResync: false,
			hasRemoteConfig: true,
			remoteUrl: 'libsql://example.turso.io',
			remoteToken: 'secret',
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

	it('手动同步时调用 force_sync', async () => {
		mockedInvoke.mockResolvedValue({
			enabled: true,
			status: 'idle',
			lastPushAt: '2026-06-26T00:00:00Z',
			lastPullAt: '2026-06-26T00:00:00Z',
			lastError: null,
			lastErrorMode: null,
			dirtySince: null,
			pendingResync: false,
			hasRemoteConfig: true,
			remoteUrl: 'libsql://example.turso.io',
			remoteToken: 'secret',
		})

		await forceSync()

		expect(mockedInvoke).toHaveBeenCalledWith('force_sync')
	})
})
