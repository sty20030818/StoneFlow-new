import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkUpdate, getUpdateSettings } from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'
import { useManualUpdateCheck } from './useManualUpdateCheck'

vi.mock('../api/updates', () => ({
	checkUpdate: vi.fn(),
	getUpdateSettings: vi.fn(),
}))

vi.mock('sonner', () => ({
	toast: {
		error: vi.fn(),
		success: vi.fn(),
	},
}))

const updateSettings = {
	channel: 'stable' as const,
	checkIntervalSecs: 60 * 60,
	checkMode: 'notifyOnly' as const,
	lastCheckedAt: null,
	skippedVersion: null,
}

describe('useManualUpdateCheck', () => {
	beforeEach(() => {
		useUpdateStore.getState().reset()
		vi.clearAllMocks()
	})

	it('发现新版本时复用 update store 的可用更新状态', async () => {
		vi.mocked(getUpdateSettings).mockResolvedValue(updateSettings)
		vi.mocked(checkUpdate).mockResolvedValue({ version: '0.2.0' })
		const { result } = renderHook(() => useManualUpdateCheck())

		await act(async () => {
			await result.current.checkNow()
		})

		expect(checkUpdate).toHaveBeenCalledWith(true)
		expect(useUpdateStore.getState()).toMatchObject({
			dialogVisible: true,
			phase: 'available',
			updateInfo: { version: '0.2.0' },
		})
	})

	it('在第一个 await 前进入 checking，阻止重复检查', async () => {
		let resolveSettings: ((value: typeof updateSettings) => void) | undefined
		vi.mocked(getUpdateSettings).mockReturnValue(
			new Promise((resolve) => {
				resolveSettings = resolve
			}),
		)
		vi.mocked(checkUpdate).mockResolvedValue(null)
		const { result } = renderHook(() => useManualUpdateCheck())

		act(() => {
			void result.current.checkNow()
			void result.current.checkNow()
		})

		expect(useUpdateStore.getState().phase).toBe('checking')
		expect(getUpdateSettings).toHaveBeenCalledTimes(1)

		await act(async () => {
			resolveSettings?.(updateSettings)
		})

		expect(checkUpdate).toHaveBeenCalledTimes(1)
	})

	it('检查失败时将错误写入统一状态机', async () => {
		vi.mocked(getUpdateSettings).mockRejectedValue(new Error('网络不可用'))
		const { result } = renderHook(() => useManualUpdateCheck())

		await act(async () => {
			await result.current.checkNow()
		})

		expect(useUpdateStore.getState()).toMatchObject({
			errorMessage: '网络不可用',
			phase: 'error',
		})
	})
})
