import { useCallback, useEffect, useRef } from 'react'

const PANEL_CLOSE_DELAY_MS = 220

type UseLauncherTransientUiArgs = {
	activePopover: string | null
	requestClose: (reason: 'escape' | 'submit') => Promise<void>
}

export function useLauncherTransientUi({
	activePopover,
	requestClose,
}: UseLauncherTransientUiArgs) {
	const titleInputRef = useRef<HTMLInputElement>(null)
	const projectSearchRef = useRef<HTMLInputElement>(null)
	const closeTimerRef = useRef<number | null>(null)
	const focusFrameRefs = useRef<number[]>([])
	const projectFocusFrameRef = useRef<number | null>(null)
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
		if (activePopover !== 'project') {
			return
		}

		projectFocusFrameRef.current = window.requestAnimationFrame(() => {
			projectSearchRef.current?.focus()
		})

		return () => {
			if (projectFocusFrameRef.current !== null) {
				window.cancelAnimationFrame(projectFocusFrameRef.current)
				projectFocusFrameRef.current = null
			}
		}
	}, [activePopover])

	useEffect(() => {
		const handler = (event: globalThis.KeyboardEvent) => {
			if (event.defaultPrevented || event.key !== 'Escape') {
				return
			}

			event.preventDefault()
			handleEscapeRef.current()
		}

		document.addEventListener('keydown', handler)
		return () => {
			document.removeEventListener('keydown', handler)
			if (closeTimerRef.current !== null) {
				window.clearTimeout(closeTimerRef.current)
			}
			for (const frameId of focusFrameRefs.current) {
				window.cancelAnimationFrame(frameId)
			}
			focusFrameRefs.current = []
			if (projectFocusFrameRef.current !== null) {
				window.cancelAnimationFrame(projectFocusFrameRef.current)
				projectFocusFrameRef.current = null
			}
		}
	}, [])

	return {
		closeWindow,
		focusInput,
		projectSearchRef,
		registerHandleEscape: (handleEscape: () => void) => {
			handleEscapeRef.current = handleEscape
		},
		scheduleClose,
		titleInputRef,
	}
}
