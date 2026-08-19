import { useCallback, useEffect, useRef } from 'react'

import { matchLauncherShortcut } from '../model/launcherShortcutKeymap'

const PANEL_CLOSE_DELAY_MS = 220

type UseLauncherTransientUiArgs = {
	requestClose: (reason: 'escape' | 'submit') => Promise<void>
}

export function useLauncherTransientUi({ requestClose }: UseLauncherTransientUiArgs) {
	const titleInputRef = useRef<HTMLInputElement>(null)
	const closeTimerRef = useRef<number | null>(null)
	const focusFrameRefs = useRef<number[]>([])
	const handleEscapeRef = useRef<() => void>(() => {})

	const focusInput = useCallback(() => {
		const frameA = window.requestAnimationFrame(() => {
			const frameB = window.requestAnimationFrame(() => {
				focusFrameRefs.current = focusFrameRefs.current.filter((id) => id !== frameB)
				titleInputRef.current?.focus()
				titleInputRef.current?.setSelectionRange(
					titleInputRef.current.value.length,
					titleInputRef.current.value.length,
				)
			})
			focusFrameRefs.current.push(frameB)
		})
		focusFrameRefs.current.push(frameA)
	}, [])

	const closeWindow = useCallback(async () => {
		if (closeTimerRef.current !== null) {
			window.clearTimeout(closeTimerRef.current)
			closeTimerRef.current = null
		}

		await requestClose('escape')
	}, [requestClose])

	const scheduleClose = useCallback(() => {
		if (closeTimerRef.current !== null) {
			window.clearTimeout(closeTimerRef.current)
		}

		closeTimerRef.current = window.setTimeout(() => {
			void requestClose('submit')
		}, PANEL_CLOSE_DELAY_MS)
	}, [requestClose])

	useEffect(() => {
		const handler = (event: globalThis.KeyboardEvent) => {
			if (
				event.defaultPrevented ||
				event.isComposing ||
				matchLauncherShortcut(event) !== 'clearOrClose'
			) {
				return
			}

			event.preventDefault()
			handleEscapeRef.current()
		}

		// Launcher 自己定义了 Escape 的分层语义，需要在子弹层消费事件前先做路由。
		document.addEventListener('keydown', handler, true)
		return () => {
			document.removeEventListener('keydown', handler, true)
			if (closeTimerRef.current !== null) {
				window.clearTimeout(closeTimerRef.current)
			}
			for (const frameId of focusFrameRefs.current) {
				window.cancelAnimationFrame(frameId)
			}
			focusFrameRefs.current = []
		}
	}, [])

	return {
		closeWindow,
		focusInput,
		registerHandleEscape: (handleEscape: () => void) => {
			handleEscapeRef.current = handleEscape
		},
		scheduleClose,
		titleInputRef,
	}
}
