import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
	DEFAULT_SIDEBAR_WIDTH,
	SHELL_DESKTOP_MEDIA_QUERY,
	SIDEBAR_ICON_RAIL_PX,
	SIDEBAR_WIDTH_MAX,
	SIDEBAR_WIDTH_MIN,
} from '@/shared/lib/shellSidebarGeometry'

export type ShellSidebarDesktopPreference = 'expanded' | 'collapsed'
export type ShellSidebarMode = 'expanded' | 'icon' | 'compact'

export type ShellSidebarPreferences = {
	width: number
	desktopPreference: ShellSidebarDesktopPreference
}

type UseShellSidebarControllerOptions = {
	initialPreferences: ShellSidebarPreferences
	onPreferencesCommit: (preferences: ShellSidebarPreferences) => void
}

function clampWidth(width: number) {
	return Math.min(SIDEBAR_WIDTH_MAX, Math.max(SIDEBAR_WIDTH_MIN, Math.round(width)))
}

function createDesktopMediaQuery() {
	if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
		return null
	}
	return window.matchMedia(SHELL_DESKTOP_MEDIA_QUERY)
}

/**
 * Shell Sidebar 的唯一交互状态 owner。
 *
 * 设备偏好只负责首帧注入和提交后的持久化；挂载后宽窄、compact Sheet 与 live resize
 * 都由本 controller 管理，避免 HeroUI Provider、CSS 断点和设置 store 各存一份状态。
 */
export function useShellSidebarController({
	initialPreferences,
	onPreferencesCommit,
}: UseShellSidebarControllerOptions) {
	const initialWidth = clampWidth(initialPreferences.width ?? DEFAULT_SIDEBAR_WIDTH)
	const [desktopPreference, setDesktopPreference] = useState<ShellSidebarDesktopPreference>(
		initialPreferences.desktopPreference,
	)
	const [committedWidth, setCommittedWidth] = useState(initialWidth)
	const [liveWidth, setLiveWidth] = useState(initialWidth)
	const [isResizing, setIsResizing] = useState(false)
	const [mobileSheetOpen, setMobileSheetOpenState] = useState(false)
	const [desktopMediaQuery] = useState(createDesktopMediaQuery)
	const [isCompact, setIsCompact] = useState(() =>
		desktopMediaQuery ? !desktopMediaQuery.matches : false,
	)

	const committedWidthRef = useRef(initialWidth)
	const resizingRef = useRef(false)

	useEffect(() => {
		if (resizingRef.current) {
			return
		}
		const width = clampWidth(initialPreferences.width)
		committedWidthRef.current = width
		setCommittedWidth(width)
		setLiveWidth(width)
		setDesktopPreference(initialPreferences.desktopPreference)
	}, [initialPreferences.desktopPreference, initialPreferences.width])

	useEffect(() => {
		if (!desktopMediaQuery) {
			return
		}

		const applyViewport = () => {
			const nextCompact = !desktopMediaQuery.matches
			setIsCompact(nextCompact)
			setMobileSheetOpenState(false)

			if (nextCompact && resizingRef.current) {
				resizingRef.current = false
				setIsResizing(false)
				setLiveWidth(committedWidthRef.current)
			}
		}

		applyViewport()
		desktopMediaQuery.addEventListener('change', applyViewport)
		return () => desktopMediaQuery.removeEventListener('change', applyViewport)
	}, [desktopMediaQuery])

	const commitPreferences = useCallback(
		(next: ShellSidebarPreferences) => {
			const normalized = {
				width: clampWidth(next.width),
				desktopPreference: next.desktopPreference,
			} satisfies ShellSidebarPreferences

			committedWidthRef.current = normalized.width
			setCommittedWidth(normalized.width)
			setLiveWidth(normalized.width)
			setDesktopPreference(normalized.desktopPreference)
			onPreferencesCommit(normalized)
		},
		[onPreferencesCommit],
	)

	const setDesktopOpen = useCallback(
		(open: boolean) => {
			if (isCompact) {
				return
			}
			commitPreferences({
				width: committedWidthRef.current,
				desktopPreference: open ? 'expanded' : 'collapsed',
			})
		},
		[commitPreferences, isCompact],
	)

	const setMobileSheetOpen = useCallback(
		(open: boolean) => {
			setMobileSheetOpenState(isCompact && open)
		},
		[isCompact],
	)

	const toggleSidebar = useCallback(() => {
		if (isCompact) {
			setMobileSheetOpenState((open) => !open)
			return
		}
		setDesktopOpen(desktopPreference !== 'expanded')
	}, [desktopPreference, isCompact, setDesktopOpen])

	const beginResize = useCallback(() => {
		if (isCompact || resizingRef.current) {
			return
		}
		resizingRef.current = true
		setLiveWidth(committedWidthRef.current)
		setIsResizing(true)
	}, [isCompact])

	const resizeTo = useCallback((width: number) => {
		if (!resizingRef.current) {
			return
		}
		setLiveWidth(clampWidth(width))
	}, [])

	const commitResize = useCallback(
		(width: number) => {
			if (!resizingRef.current) {
				return
			}
			resizingRef.current = false
			setIsResizing(false)
			commitPreferences({ width, desktopPreference: 'expanded' })
		},
		[commitPreferences],
	)

	const cancelResize = useCallback(() => {
		if (!resizingRef.current) {
			return
		}
		resizingRef.current = false
		setIsResizing(false)
		setLiveWidth(committedWidthRef.current)
	}, [])

	const commitKeyboardWidth = useCallback(
		(width: number) => {
			commitPreferences({ width, desktopPreference: 'expanded' })
		},
		[commitPreferences],
	)

	const mode: ShellSidebarMode = isCompact
		? 'compact'
		: desktopPreference === 'expanded' || isResizing
			? 'expanded'
			: 'icon'
	const providerOpen = isCompact || mode === 'expanded'
	const visibleWidth = mode === 'compact' ? 0 : mode === 'icon' ? SIDEBAR_ICON_RAIL_PX : liveWidth

	return useMemo(
		() => ({
			mode,
			isCompact,
			isResizing,
			providerOpen,
			desktopPreference,
			committedWidth,
			liveWidth,
			visibleWidth,
			mobileSheetOpen,
			setDesktopOpen,
			setMobileSheetOpen,
			toggleSidebar,
			beginResize,
			resizeTo,
			commitResize,
			cancelResize,
			commitKeyboardWidth,
		}),
		[
			beginResize,
			cancelResize,
			commitKeyboardWidth,
			commitResize,
			committedWidth,
			desktopPreference,
			isCompact,
			isResizing,
			liveWidth,
			mobileSheetOpen,
			mode,
			providerOpen,
			resizeTo,
			setDesktopOpen,
			setMobileSheetOpen,
			toggleSidebar,
			visibleWidth,
		],
	)
}

export type ShellSidebarController = ReturnType<typeof useShellSidebarController>
