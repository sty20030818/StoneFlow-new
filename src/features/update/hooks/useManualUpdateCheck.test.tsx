import { act, renderHook } from '@testing-library/react'
import { toast } from '@heroui/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { checkUpdate, type ManualUpdateCheckResult } from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'
import { useManualUpdateCheck } from './useManualUpdateCheck'

vi.mock('../api/updates', () => ({
	checkUpdate: vi.fn(),
}))

vi.mock('@heroui/react', () => ({
	toast: {
		danger: vi.fn(),
		success: vi.fn(),
	},
}))

const availableResult: ManualUpdateCheckResult = {
	status: 'ok',
	snapshot: {
		revision: 1,
		phase: 'available',
		update: { version: '0.2.0', channel: 'beta' },
		progress: null,
		errorMessage: null,
	},
	noUpdate: false,
}

describe('useManualUpdateCheck', () => {
	beforeEach(() => {
		useUpdateStore.getState().reset()
		vi.clearAllMocks()
	})

	it('发现新版本时应用权威 snapshot 并打开 Dialog', async () => {
		vi.mocked(checkUpdate).mockResolvedValue(availableResult)
		const { result } = renderHook(() => useManualUpdateCheck())

		await act(async () => {
			await result.current.checkNow()
		})

		expect(checkUpdate).toHaveBeenCalledWith()
		expect(useUpdateStore.getState()).toMatchObject({
			dialogVisible: true,
			manualCheckPending: false,
			snapshot: availableResult.snapshot,
		})
	})

	it('在第一个 await 前占位，阻止重复检查', async () => {
		let resolveCheck: ((value: ManualUpdateCheckResult) => void) | undefined
		vi.mocked(checkUpdate).mockReturnValue(
			new Promise((resolve) => {
				resolveCheck = resolve
			}),
		)
		const { result } = renderHook(() => useManualUpdateCheck())
		let request: Promise<void> | undefined

		act(() => {
			request = result.current.checkNow()
			void result.current.checkNow()
		})

		expect(useUpdateStore.getState().manualCheckPending).toBe(true)
		expect(checkUpdate).toHaveBeenCalledTimes(1)

		await act(async () => {
			resolveCheck?.(availableResult)
			await request
		})
	})

	it('Installing 时禁用所有手动检查入口', async () => {
		useUpdateStore.getState().applySnapshot({
			revision: 0,
			phase: 'installing',
			update: { version: '0.2.0', channel: 'beta' },
			progress: null,
			errorMessage: null,
		})
		const { result } = renderHook(() => useManualUpdateCheck())

		expect(result.current.disabled).toBe(true)
		await act(async () => {
			await result.current.checkNow()
		})
		expect(checkUpdate).not.toHaveBeenCalled()
	})

	it('失败事件丢失时仍先应用命令返回的权威 snapshot 再提示错误', async () => {
		vi.mocked(checkUpdate).mockResolvedValue({
			status: 'failed',
			message: '更新失败: 网络不可用',
			snapshot: {
				revision: 1,
				phase: 'idle',
				update: null,
				progress: null,
				errorMessage: '更新失败: 网络不可用',
			},
		})
		const { result } = renderHook(() => useManualUpdateCheck())

		await act(async () => {
			await result.current.checkNow()
		})

		expect(useUpdateStore.getState().snapshot).toMatchObject({
			revision: 1,
			errorMessage: '更新失败: 网络不可用',
		})
		expect(toast.danger).toHaveBeenCalledWith('更新失败: 网络不可用')
	})

	it('迟到的 noUpdate 响应不能遮住更高 revision 的新版本', async () => {
		let resolveCheck: ((value: ManualUpdateCheckResult) => void) | undefined
		vi.mocked(checkUpdate).mockReturnValue(
			new Promise((resolve) => {
				resolveCheck = resolve
			}),
		)
		const { result } = renderHook(() => useManualUpdateCheck())

		let request: Promise<void> | undefined
		act(() => {
			request = result.current.checkNow()
		})
		act(() => {
			useUpdateStore.getState().applySnapshot({
				revision: 2,
				phase: 'available',
				update: { version: '0.3.0', channel: 'stable' },
				progress: null,
				errorMessage: null,
			})
		})

		await act(async () => {
			resolveCheck?.({
				status: 'ok',
				snapshot: {
					revision: 1,
					phase: 'idle',
					update: null,
					progress: null,
					errorMessage: null,
				},
				noUpdate: true,
			})
			await request
		})

		expect(useUpdateStore.getState()).toMatchObject({
			noUpdate: false,
			snapshot: { revision: 2, update: { version: '0.3.0' } },
		})
	})
})
