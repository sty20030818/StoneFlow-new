import { act, renderHook } from '@testing-library/react'

import { SHELL_DESKTOP_MEDIA_QUERY } from '@/shared/lib/shellSidebarGeometry'
import { useShellSidebarController } from './useShellSidebarController'

type MatchMediaController = {
	setDesktop: (desktop: boolean) => void
}

describe('useShellSidebarController', () => {
	it('使用唯一 1024px media source 派生 compact，且断点不覆盖桌面偏好', () => {
		const media = installMatchMedia(true)
		const onPreferencesCommit = vi.fn()
		const { result } = renderHook(() =>
			useShellSidebarController({
				initialPreferences: { width: 256, desktopPreference: 'collapsed' },
				onPreferencesCommit,
			}),
		)

		expect(window.matchMedia).toHaveBeenCalledTimes(1)
		expect(window.matchMedia).toHaveBeenCalledWith(SHELL_DESKTOP_MEDIA_QUERY)
		expect(result.current.mode).toBe('icon')
		expect(result.current.visibleWidth).toBe(48)

		act(() => media.setDesktop(false))
		expect(result.current.mode).toBe('compact')
		expect(result.current.visibleWidth).toBe(0)
		expect(result.current.providerOpen).toBe(true)

		act(() => result.current.toggleSidebar())
		expect(result.current.mobileSheetOpen).toBe(true)
		expect(onPreferencesCommit).not.toHaveBeenCalled()

		act(() => media.setDesktop(true))
		expect(result.current.mode).toBe('icon')
		expect(result.current.mobileSheetOpen).toBe(false)
		expect(onPreferencesCommit).not.toHaveBeenCalled()
	})

	it('desktop toggle 提交完整偏好，compact toggle 只控制 Sheet', () => {
		const media = installMatchMedia(true)
		const onPreferencesCommit = vi.fn()
		const { result } = renderHook(() =>
			useShellSidebarController({
				initialPreferences: { width: 280, desktopPreference: 'expanded' },
				onPreferencesCommit,
			}),
		)

		act(() => result.current.toggleSidebar())
		expect(result.current.mode).toBe('icon')
		expect(onPreferencesCommit).toHaveBeenLastCalledWith({
			width: 280,
			desktopPreference: 'collapsed',
		})

		act(() => media.setDesktop(false))
		act(() => result.current.setMobileSheetOpen(true))
		expect(result.current.mobileSheetOpen).toBe(true)
		expect(onPreferencesCommit).toHaveBeenCalledTimes(1)
	})

	it('resize 只更新 live width，cancel 回滚且 commit 原子恢复 collapsed', () => {
		installMatchMedia(true)
		const onPreferencesCommit = vi.fn()
		const { result } = renderHook(() =>
			useShellSidebarController({
				initialPreferences: { width: 256, desktopPreference: 'collapsed' },
				onPreferencesCommit,
			}),
		)

		act(() => {
			result.current.beginResize()
			result.current.resizeTo(300)
		})
		expect(result.current.mode).toBe('expanded')
		expect(result.current.committedWidth).toBe(256)
		expect(result.current.liveWidth).toBe(300)
		expect(result.current.isResizing).toBe(true)
		expect(onPreferencesCommit).not.toHaveBeenCalled()

		act(() => result.current.cancelResize())
		expect(result.current.mode).toBe('icon')
		expect(result.current.liveWidth).toBe(256)
		expect(onPreferencesCommit).not.toHaveBeenCalled()

		act(() => {
			result.current.beginResize()
			result.current.resizeTo(292)
			result.current.commitResize(292)
		})
		expect(result.current.mode).toBe('expanded')
		expect(result.current.committedWidth).toBe(292)
		expect(result.current.liveWidth).toBe(292)
		expect(onPreferencesCommit).toHaveBeenCalledOnce()
		expect(onPreferencesCommit).toHaveBeenCalledWith({
			width: 292,
			desktopPreference: 'expanded',
		})
	})

	it('进入 compact 会取消进行中的 resize，保留已提交宽度', () => {
		const media = installMatchMedia(true)
		const onPreferencesCommit = vi.fn()
		const { result } = renderHook(() =>
			useShellSidebarController({
				initialPreferences: { width: 256, desktopPreference: 'expanded' },
				onPreferencesCommit,
			}),
		)

		act(() => {
			result.current.beginResize()
			result.current.resizeTo(320)
			media.setDesktop(false)
		})

		expect(result.current.mode).toBe('compact')
		expect(result.current.isResizing).toBe(false)
		expect(result.current.liveWidth).toBe(256)
		expect(onPreferencesCommit).not.toHaveBeenCalled()
	})
})

function installMatchMedia(initialDesktop: boolean): MatchMediaController {
	let matches = initialDesktop
	const listeners = new Set<(event: MediaQueryListEvent) => void>()
	const mediaQuery = {
		get matches() {
			return matches
		},
		media: SHELL_DESKTOP_MEDIA_QUERY,
		onchange: null,
		addEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
			listeners.add(listener as (event: MediaQueryListEvent) => void)
		},
		removeEventListener: (_type: string, listener: EventListenerOrEventListenerObject) => {
			listeners.delete(listener as (event: MediaQueryListEvent) => void)
		},
		addListener: (listener: (event: MediaQueryListEvent) => void) => {
			listeners.add(listener)
		},
		removeListener: (listener: (event: MediaQueryListEvent) => void) => {
			listeners.delete(listener)
		},
		dispatchEvent: () => false,
	} satisfies MediaQueryList

	Object.defineProperty(window, 'matchMedia', {
		configurable: true,
		value: vi.fn(() => mediaQuery),
	})

	return {
		setDesktop: (desktop) => {
			matches = desktop
			const event = { matches, media: mediaQuery.media } as MediaQueryListEvent
			listeners.forEach((listener) => listener(event))
		},
	}
}
