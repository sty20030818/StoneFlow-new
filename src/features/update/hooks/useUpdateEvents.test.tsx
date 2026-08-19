import { act, renderHook, waitFor } from '@testing-library/react'
import { toast } from '@heroui/react'
import { isTauri } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import type * as TauriEvent from '@tauri-apps/api/event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
	consumeCompletedUpdate,
	getUpdateSettings,
	getUpdateSession,
	UPDATE_SESSION_CHANGED_EVENT,
	type UpdateSessionSnapshot,
} from '../api/updates'
import { useUpdateStore } from '../model/useUpdateStore'
import { useUpdateEvents } from './useUpdateEvents'

vi.mock('@tauri-apps/api/event', () => ({
	listen: vi.fn<typeof TauriEvent.listen>(),
}))

vi.mock('@tauri-apps/api/core', () => ({
	isTauri: vi.fn(() => true),
}))

vi.mock('../api/updates', () => ({
	consumeCompletedUpdate: vi.fn(),
	getUpdateSettings: vi.fn(),
	getUpdateSession: vi.fn(),
	UPDATE_SESSION_CHANGED_EVENT: 'update-session-changed',
}))

vi.mock('@heroui/react', () => ({
	toast: { success: vi.fn() },
}))

const mockedListen = vi.mocked(listen)
const mockedIsTauri = vi.mocked(isTauri)
const mockedConsumeCompletedUpdate = vi.mocked(consumeCompletedUpdate)
const mockedGetUpdateSettings = vi.mocked(getUpdateSettings)
const mockedGetUpdateSession = vi.mocked(getUpdateSession)

function snapshot(revision: number, phase: UpdateSessionSnapshot['phase']): UpdateSessionSnapshot {
	return {
		revision,
		phase,
		update: phase === 'idle' ? null : { version: '0.2.0', channel: 'beta' },
		progress: null,
		errorMessage: null,
	}
}

describe('useUpdateEvents', () => {
	beforeEach(() => {
		useUpdateStore.getState().reset()
		vi.clearAllMocks()
		mockedConsumeCompletedUpdate.mockResolvedValue(null)
		mockedIsTauri.mockReturnValue(true)
		mockedGetUpdateSettings.mockResolvedValue({
			checkMode: 'notifyOnly',
			channel: 'stable',
			skippedVersion: null,
			lastCheckedAt: null,
			checkIntervalSecs: 21_600,
		})
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('先订阅再 hydrate，且迟到的旧 snapshot 不能覆盖新事件', async () => {
		const unlisten = vi.fn<() => void>()
		let eventCallback: TauriEvent.EventCallback<UpdateSessionSnapshot> = () => undefined
		let resolveListen: ((release: () => void) => void) | undefined
		let resolveHydrate: ((value: UpdateSessionSnapshot) => void) | undefined

		mockedListen.mockImplementation((_eventName, handler) => {
			eventCallback = handler as TauriEvent.EventCallback<UpdateSessionSnapshot>
			return new Promise((resolve) => {
				resolveListen = resolve
			})
		})
		mockedGetUpdateSession.mockReturnValue(
			new Promise((resolve) => {
				resolveHydrate = resolve
			}),
		)

		const { unmount } = renderHook(() => useUpdateEvents())

		expect(mockedListen).toHaveBeenCalledWith(UPDATE_SESSION_CHANGED_EVENT, expect.any(Function))
		expect(mockedGetUpdateSession).not.toHaveBeenCalled()

		await act(async () => {
			resolveListen?.(unlisten)
		})
		await waitFor(() => expect(mockedGetUpdateSession).toHaveBeenCalledTimes(1))

		act(() => {
			eventCallback({
				event: UPDATE_SESSION_CHANGED_EVENT,
				id: 1,
				payload: snapshot(2, 'ready'),
			})
		})
		await act(async () => {
			resolveHydrate?.(snapshot(1, 'available'))
		})

		expect(useUpdateStore.getState().snapshot).toMatchObject({ revision: 2, phase: 'ready' })
		unmount()
		expect(unlisten).toHaveBeenCalledTimes(1)
	})

	it('首次订阅失败仍 hydrate，并在重试成功后恢复事件', async () => {
		vi.useFakeTimers()
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const listenerError = new Error('listener unavailable')
		const unlisten = vi.fn<() => void>()
		let eventCallback: TauriEvent.EventCallback<UpdateSessionSnapshot> = () => undefined
		mockedListen
			.mockRejectedValueOnce(listenerError)
			.mockImplementationOnce(async (_eventName, handler) => {
				eventCallback = handler as TauriEvent.EventCallback<UpdateSessionSnapshot>
				return unlisten
			})
		mockedGetUpdateSession.mockResolvedValue(snapshot(1, 'available'))

		const { unmount } = renderHook(() => useUpdateEvents())
		await act(async () => {
			await Promise.resolve()
			await Promise.resolve()
		})
		expect(mockedGetUpdateSession).toHaveBeenCalledTimes(1)
		expect(errorSpy).toHaveBeenCalledWith('Failed to setup update session listener:', listenerError)
		expect(errorSpy).toHaveBeenCalledTimes(1)
		expect(useUpdateStore.getState().snapshot).toMatchObject({ revision: 1, phase: 'available' })

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(mockedListen).toHaveBeenCalledTimes(2)
		expect(mockedGetUpdateSession).toHaveBeenCalledTimes(2)
		act(() => {
			eventCallback({
				event: UPDATE_SESSION_CHANGED_EVENT,
				id: 2,
				payload: snapshot(2, 'ready'),
			})
		})
		expect(useUpdateStore.getState().snapshot).toMatchObject({ revision: 2, phase: 'ready' })

		unmount()
		expect(unlisten).toHaveBeenCalledTimes(1)
		errorSpy.mockRestore()
	})

	it('订阅成功但首次 hydrate 失败时只重试 hydrate', async () => {
		vi.useFakeTimers()
		const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined)
		const hydrateError = new Error('hydrate unavailable')
		mockedListen.mockResolvedValue(() => undefined)
		mockedGetUpdateSession
			.mockRejectedValueOnce(hydrateError)
			.mockResolvedValueOnce(snapshot(3, 'ready'))

		renderHook(() => useUpdateEvents())
		await act(async () => {
			await Promise.resolve()
			await Promise.resolve()
		})
		expect(mockedListen).toHaveBeenCalledTimes(1)
		expect(mockedGetUpdateSession).toHaveBeenCalledTimes(1)
		expect(errorSpy).toHaveBeenCalledWith('Failed to hydrate update session:', hydrateError)
		expect(errorSpy).toHaveBeenCalledTimes(1)

		await act(async () => {
			await vi.advanceTimersByTimeAsync(1000)
		})
		expect(mockedListen).toHaveBeenCalledTimes(1)
		expect(mockedGetUpdateSession).toHaveBeenCalledTimes(2)
		expect(useUpdateStore.getState().snapshot).toMatchObject({ revision: 3, phase: 'ready' })
		errorSpy.mockRestore()
	})

	it('浏览器预览不启动 Tauri listener 重试', () => {
		mockedIsTauri.mockReturnValue(false)

		renderHook(() => useUpdateEvents())

		expect(mockedListen).not.toHaveBeenCalled()
		expect(mockedGetUpdateSession).not.toHaveBeenCalled()
		expect(mockedConsumeCompletedUpdate).not.toHaveBeenCalled()
	})

	it('仅提醒模式接受 Available snapshot 后打开 Dialog', async () => {
		let eventCallback: TauriEvent.EventCallback<UpdateSessionSnapshot> = () => undefined
		mockedListen.mockImplementation(async (_eventName, handler) => {
			eventCallback = handler as TauriEvent.EventCallback<UpdateSessionSnapshot>
			return () => undefined
		})
		mockedGetUpdateSession.mockResolvedValue(snapshot(0, 'idle'))

		renderHook(() => useUpdateEvents())
		await waitFor(() => expect(mockedGetUpdateSession).toHaveBeenCalledTimes(1))

		act(() => {
			eventCallback({
				event: UPDATE_SESSION_CHANGED_EVENT,
				id: 1,
				payload: snapshot(1, 'available'),
			})
		})

		await waitFor(() => expect(useUpdateStore.getState().dialogVisible).toBe(true))
	})

	it('设置读取返回前会话已进入 Downloading 时不打开过期 Dialog', async () => {
		let eventCallback: TauriEvent.EventCallback<UpdateSessionSnapshot> = () => undefined
		let resolveSettings:
			| ((value: Awaited<ReturnType<typeof getUpdateSettings>>) => void)
			| undefined
		mockedListen.mockImplementation(async (_eventName, handler) => {
			eventCallback = handler as TauriEvent.EventCallback<UpdateSessionSnapshot>
			return () => undefined
		})
		mockedGetUpdateSession.mockResolvedValue(snapshot(0, 'idle'))
		mockedGetUpdateSettings.mockReturnValue(
			new Promise((resolve) => {
				resolveSettings = resolve
			}),
		)

		renderHook(() => useUpdateEvents())
		await waitFor(() => expect(mockedGetUpdateSession).toHaveBeenCalledTimes(1))
		act(() => {
			eventCallback({
				event: UPDATE_SESSION_CHANGED_EVENT,
				id: 1,
				payload: snapshot(1, 'available'),
			})
			eventCallback({
				event: UPDATE_SESSION_CHANGED_EVENT,
				id: 2,
				payload: snapshot(2, 'downloading'),
			})
		})
		await act(async () => {
			resolveSettings?.({
				checkMode: 'notifyOnly',
				channel: 'stable',
				skippedVersion: null,
				lastCheckedAt: null,
				checkIntervalSecs: 21_600,
			})
		})

		expect(useUpdateStore.getState()).toMatchObject({
			dialogVisible: false,
			snapshot: { revision: 2, phase: 'downloading' },
		})
	})

	it('取消下载恢复 Available 后不会被仅提醒模式重新打开 Dialog', async () => {
		let eventCallback: TauriEvent.EventCallback<UpdateSessionSnapshot> = () => undefined
		mockedListen.mockImplementation(async (_eventName, handler) => {
			eventCallback = handler as TauriEvent.EventCallback<UpdateSessionSnapshot>
			return () => undefined
		})
		mockedGetUpdateSession.mockResolvedValue(snapshot(1, 'downloading'))

		renderHook(() => useUpdateEvents())
		await waitFor(() =>
			expect(useUpdateStore.getState().snapshot).toMatchObject({ phase: 'downloading' }),
		)
		act(() => {
			eventCallback({
				event: UPDATE_SESSION_CHANGED_EVENT,
				id: 2,
				payload: snapshot(2, 'available'),
			})
			useUpdateStore.getState().closeDialog()
		})

		await waitFor(() => expect(useUpdateStore.getState().dialogVisible).toBe(false))
		expect(mockedGetUpdateSettings).not.toHaveBeenCalled()
	})

	it('同一 Available revision 被用户关闭后异步设置结果不能重新打开 Dialog', async () => {
		let eventCallback: TauriEvent.EventCallback<UpdateSessionSnapshot> = () => undefined
		let resolveSettings:
			| ((value: Awaited<ReturnType<typeof getUpdateSettings>>) => void)
			| undefined
		mockedListen.mockImplementation(async (_eventName, handler) => {
			eventCallback = handler as TauriEvent.EventCallback<UpdateSessionSnapshot>
			return () => undefined
		})
		mockedGetUpdateSession.mockResolvedValue(snapshot(0, 'idle'))
		mockedGetUpdateSettings.mockReturnValue(
			new Promise((resolve) => {
				resolveSettings = resolve
			}),
		)

		renderHook(() => useUpdateEvents())
		await waitFor(() => expect(mockedGetUpdateSession).toHaveBeenCalledTimes(1))
		act(() => {
			eventCallback({
				event: UPDATE_SESSION_CHANGED_EVENT,
				id: 1,
				payload: snapshot(1, 'available'),
			})
		})
		await waitFor(() => expect(mockedGetUpdateSettings).toHaveBeenCalledTimes(1))
		act(() => useUpdateStore.getState().closeDialog())
		await act(async () => {
			resolveSettings?.({
				checkMode: 'notifyOnly',
				channel: 'stable',
				skippedVersion: null,
				lastCheckedAt: null,
				checkIntervalSecs: 21_600,
			})
		})

		expect(useUpdateStore.getState().dialogVisible).toBe(false)
	})

	it('更新完成提示将 Beta 版本的来源渠道交给日志入口', async () => {
		mockedListen.mockResolvedValue(() => undefined)
		mockedGetUpdateSession.mockResolvedValue(snapshot(0, 'idle'))
		mockedConsumeCompletedUpdate.mockResolvedValue('0.2.0-beta.3')
		const onCompletedUpdate = vi.fn()

		renderHook(() => useUpdateEvents(onCompletedUpdate))
		await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1))
		const options = vi.mocked(toast.success).mock.calls[0]?.[1]
		const action = options?.actionProps
		if (action && typeof action === 'object' && 'onPress' in action) {
			act(() => action.onPress?.({} as never))
		}

		expect(onCompletedUpdate).toHaveBeenCalledWith('0.2.0-beta.3', 'beta')
	})
})
