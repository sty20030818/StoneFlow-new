import { renderHook, waitFor } from '@testing-library/react'
import { fetchHealthcheck } from '@/features/healthcheck/api/healthcheck'
import { useHealthcheckStatus } from '@/features/healthcheck/model/useHealthcheckStatus'

vi.mock('@/features/healthcheck/api/healthcheck', () => ({
	fetchHealthcheck: vi.fn<typeof fetchHealthcheck>(),
}))

const mockedFetchHealthcheck = vi.mocked(fetchHealthcheck)
const tauriWindow = window as Window & {
	__TAURI__?: unknown
	__TAURI_INTERNALS__?: unknown
}

describe('useHealthcheckStatus', () => {
	afterEach(() => {
		delete tauriWindow.__TAURI__
		delete tauriWindow.__TAURI_INTERNALS__
	})

	it('在浏览器预览环境返回 tauri-unavailable', () => {
		const { result } = renderHook(() => useHealthcheckStatus())

		expect(result.current.kind).toBe('tauri-unavailable')
		expect(mockedFetchHealthcheck).not.toHaveBeenCalled()
	})

	it('在 tauri 环境返回 ready 状态', async () => {
		tauriWindow.__TAURI__ = {}
		mockedFetchHealthcheck.mockResolvedValue({
			status: 'ok',
			app: 'desktop-app',
			databasePath: 'C:\\Users\\stone\\AppData\\Roaming\\stoneflow\\data\\app.db',
			databaseReady: true,
		})

		const { result } = renderHook(() => useHealthcheckStatus())

		await waitFor(() => {
			expect(result.current.kind).toBe('ready')
		})

		expect(mockedFetchHealthcheck).toHaveBeenCalledTimes(1)
		expect(result.current.title).toBe('C:\\Users\\stone\\AppData\\Roaming\\stoneflow\\data\\app.db')
		expect(result.current.detail).toBe('...\\stoneflow\\data\\app.db')
	})
})
