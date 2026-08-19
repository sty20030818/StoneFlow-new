import { act, renderHook } from '@testing-library/react'
import { toast } from '@heroui/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { downloadUpdate, installStagedUpdate } from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'
import { useUpdateInstallActions } from './useUpdateInstallActions'

vi.mock('../api/updates', () => ({
	cancelUpdateDownload: vi.fn(),
	downloadUpdate: vi.fn(),
	installStagedUpdate: vi.fn(),
}))

vi.mock('@heroui/react', () => ({
	toast: { danger: vi.fn() },
}))

describe('useUpdateInstallActions', () => {
	beforeEach(() => {
		useUpdateStore.getState().reset()
		vi.clearAllMocks()
	})

	it('按精确身份下载，并在 conflict 报错前应用返回的 snapshot', async () => {
		useUpdateStore.getState().applySnapshot({
			revision: 1,
			phase: 'available',
			update: { version: '0.2.0', channel: 'beta' },
			progress: null,
			errorMessage: null,
		})
		vi.mocked(downloadUpdate).mockResolvedValue({
			status: 'conflict',
			message: '候选已失效',
			snapshot: {
				revision: 2,
				phase: 'idle',
				update: null,
				progress: null,
				errorMessage: null,
			},
		})
		const { result } = renderHook(() => useUpdateInstallActions())

		await act(async () => {
			await result.current.startDownload()
		})

		expect(downloadUpdate).toHaveBeenCalledWith('0.2.0', 'beta')
		expect(useUpdateStore.getState().snapshot).toMatchObject({ revision: 2, phase: 'idle' })
		expect(toast.danger).toHaveBeenCalledWith('候选已失效')
	})

	it('下载失败事件丢失时仍从命令响应恢复权威 snapshot', async () => {
		useUpdateStore.getState().applySnapshot({
			revision: 1,
			phase: 'available',
			update: { version: '0.2.0', channel: 'beta' },
			progress: null,
			errorMessage: null,
		})
		vi.mocked(downloadUpdate).mockResolvedValue({
			status: 'failed',
			message: '更新失败: 下载中断',
			snapshot: {
				revision: 2,
				phase: 'available',
				update: { version: '0.2.0', channel: 'beta' },
				progress: null,
				errorMessage: '更新失败: 下载中断',
			},
		})
		const { result } = renderHook(() => useUpdateInstallActions())

		await act(async () => {
			await result.current.startDownload()
		})

		expect(useUpdateStore.getState().snapshot).toMatchObject({
			revision: 2,
			phase: 'available',
			errorMessage: '更新失败: 下载中断',
		})
		expect(toast.danger).toHaveBeenCalledWith('更新失败: 下载中断')
	})

	it('Ready 安装失败可直接携带精确渠道重试同一暂存版本', async () => {
		useUpdateStore.getState().applySnapshot({
			revision: 1,
			phase: 'ready',
			update: { version: '0.2.0-beta.4', channel: 'beta' },
			progress: null,
			errorMessage: '上次安装失败',
		})
		vi.mocked(installStagedUpdate).mockResolvedValue({
			status: 'ok',
			snapshot: {
				revision: 2,
				phase: 'installing',
				update: { version: '0.2.0-beta.4', channel: 'beta' },
				progress: null,
				errorMessage: null,
			},
		})
		const { result } = renderHook(() => useUpdateInstallActions())

		await act(async () => {
			await result.current.install('beta')
		})

		expect(installStagedUpdate).toHaveBeenCalledWith('0.2.0-beta.4', 'beta')
		expect(downloadUpdate).not.toHaveBeenCalled()
		expect(useUpdateStore.getState().snapshot).toMatchObject({
			revision: 2,
			phase: 'installing',
		})
	})

	it('Installing 时忽略重复安装入口', async () => {
		useUpdateStore.getState().applySnapshot({
			revision: 1,
			phase: 'installing',
			update: { version: '0.2.0', channel: 'stable' },
			progress: null,
			errorMessage: null,
		})
		const { result } = renderHook(() => useUpdateInstallActions())

		await act(async () => {
			await result.current.install(null)
		})

		expect(installStagedUpdate).not.toHaveBeenCalled()
	})
})
