import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import {
	commitLayout,
	presentSession,
	reportLayoutDiagnostics,
} from '@/features/quick-create/api/quickCreate'
import { useQuickCreateLayout } from '@/features/quick-create/layout/useQuickCreateLayout'
import { useQuickCreateSession } from '@/features/quick-create/runtime/useQuickCreateSession'
import type { QuickCreateSessionPhase } from '@/features/quick-create/runtime/quickCreateSessionTypes'
import { QuickCreateFrame } from '@/features/quick-create/ui/QuickCreateFrame'

const QUICK_CREATE_MIN_WINDOW_HEIGHT = 364
const QUICK_CREATE_RESIZE_THRESHOLD = 2
const QUICK_CREATE_DPR_THRESHOLD = 0.001

type LastAppliedResize = {
	devicePixelRatio: number
	height: number
	sessionId: string
}

type QuickCreateLayoutPresenterProps = {
	layoutRevisionKey: unknown
}

/**
 * layout presenter 只负责测量、resize、present 这条窗口编排链路。
 * shell 层只保留 feature state 到 presenter 的装配关系。
 */
export function QuickCreateLayoutPresenter({ layoutRevisionKey }: QuickCreateLayoutPresenterProps) {
	const { actions: sessionActions, state: sessionState } = useQuickCreateSession()
	const measureKey =
		'openContext' in sessionState.phase ? sessionState.phase.sessionId : sessionState.phase.type
	const layout = useQuickCreateLayout(measureKey)
	const [isWindowReady, setWindowReady] = useState(false)
	const viewportResizeRevision = useQuickCreateViewportResizeRevision(layout.requestMeasure)
	const lastAppliedResizeRef = useRef<LastAppliedResize | null>(null)
	const presentationSentRef = useRef(false)
	const lastSessionIdRef = useRef<string | null>(null)
	const activeSessionId = readActiveSessionId(sessionState.phase)

	useLayoutEffect(() => {
		if (lastSessionIdRef.current !== activeSessionId) {
			lastSessionIdRef.current = activeSessionId
			lastAppliedResizeRef.current = null
			presentationSentRef.current = false
			setWindowReady(false)
		}
	}, [activeSessionId])

	useEffect(() => {
		if (
			!isActiveLayoutPhase(sessionState.phase) ||
			!layout.isReady ||
			layout.targetHeight === null
		) {
			return
		}

		const targetHeight = Math.max(layout.targetHeight, QUICK_CREATE_MIN_WINDOW_HEIGHT)
		const devicePixelRatio = readDevicePixelRatio()
		const lastAppliedResize = lastAppliedResizeRef.current
		const sessionId = sessionState.phase.sessionId

		if (
			lastAppliedResize !== null &&
			lastAppliedResize.sessionId === sessionId &&
			Math.abs(lastAppliedResize.height - targetHeight) < QUICK_CREATE_RESIZE_THRESHOLD &&
			Math.abs(lastAppliedResize.devicePixelRatio - devicePixelRatio) < QUICK_CREATE_DPR_THRESHOLD
		) {
			return
		}

		lastAppliedResizeRef.current = {
			devicePixelRatio,
			height: targetHeight,
			sessionId,
		}

		sessionActions.commitMeasured(sessionId)
		void reportQuickCreateLayoutDiagnostics('before-resize', targetHeight, layout).catch(() => {})
		void commitLayout({
			devicePixelRatio,
			height: targetHeight,
			sessionId,
		})
			.then(() => {
				sessionActions.markReadyToPresent(sessionId)
				setWindowReady(true)
				window.requestAnimationFrame(() => {
					void reportQuickCreateLayoutDiagnostics('after-resize', targetHeight, layout).catch(
						() => {},
					)
				})
			})
			.catch(() => {})
	}, [
		layout,
		layout.isReady,
		layout.targetHeight,
		layoutRevisionKey,
		sessionActions,
		sessionState.phase,
		viewportResizeRevision,
	])

	useEffect(() => {
		if (
			sessionState.phase.type !== 'readyToPresent' ||
			!isWindowReady ||
			presentationSentRef.current
		) {
			return
		}

		presentationSentRef.current = true
		void presentSession({ sessionId: sessionState.phase.sessionId }).catch(() => {
			presentationSentRef.current = false
		})
	}, [isWindowReady, sessionState.phase])

	return (
		<QuickCreateFrame
			isVisible={isWindowReady && activeSessionId !== null}
			layout={layout}
			onRequestClose={() => {
				void sessionActions.requestClose('blur')
			}}
		/>
	)
}

function isActiveLayoutPhase(
	phase: QuickCreateSessionPhase,
): phase is Extract<
	QuickCreateSessionPhase,
	{ type: 'preparing' | 'measuring' | 'readyToPresent' | 'visible' }
> {
	return (
		phase.type === 'preparing' ||
		phase.type === 'measuring' ||
		phase.type === 'readyToPresent' ||
		phase.type === 'visible'
	)
}

function useQuickCreateViewportResizeRevision(requestMeasure: () => void) {
	const [revision, setRevision] = useState(0)
	const requestMeasureRef = useRef(requestMeasure)

	useEffect(() => {
		requestMeasureRef.current = requestMeasure
	}, [requestMeasure])

	useEffect(() => {
		let disposed = false
		let removeResolutionListener = () => {}

		const notifyViewportChanged = () => {
			if (disposed) {
				return
			}

			requestMeasureRef.current()
			setRevision((current) => current + 1)
		}

		const installResolutionListener = () => {
			removeResolutionListener()

			if (typeof window.matchMedia !== 'function') {
				removeResolutionListener = () => {}
				return
			}

			const mediaQuery = window.matchMedia(`(resolution: ${readDevicePixelRatio()}dppx)`)
			const handleResolutionChange = () => {
				notifyViewportChanged()
				installResolutionListener()
			}

			if (typeof mediaQuery.addEventListener === 'function') {
				mediaQuery.addEventListener('change', handleResolutionChange)
				removeResolutionListener = () => {
					mediaQuery.removeEventListener('change', handleResolutionChange)
				}
				return
			}

			mediaQuery.addListener(handleResolutionChange)
			removeResolutionListener = () => {
				mediaQuery.removeListener(handleResolutionChange)
			}
		}

		window.addEventListener('resize', notifyViewportChanged)
		window.visualViewport?.addEventListener('resize', notifyViewportChanged)
		installResolutionListener()

		return () => {
			disposed = true
			removeResolutionListener()
			window.removeEventListener('resize', notifyViewportChanged)
			window.visualViewport?.removeEventListener('resize', notifyViewportChanged)
		}
	}, [])

	return revision
}

function readDevicePixelRatio() {
	return Number.isFinite(window.devicePixelRatio) && window.devicePixelRatio > 0
		? window.devicePixelRatio
		: 1
}

function readActiveSessionId(phase: QuickCreateSessionPhase): string | null {
	return 'sessionId' in phase ? (phase.sessionId ?? null) : null
}

function reportQuickCreateLayoutDiagnostics(
	phase: string,
	targetHeight: number,
	layout: ReturnType<typeof useQuickCreateLayout>,
) {
	const root = document.getElementById('root')
	const surface = layout.getNode('surface')
	const content = layout.getNode('content')
	const footer = layout.getNode('footer')

	return reportLayoutDiagnostics({
		phase,
		targetHeight,
		viewportHeight: window.innerHeight,
		devicePixelRatio: window.devicePixelRatio,
		visualViewportWidth: window.visualViewport?.width ?? 0,
		visualViewportHeight: window.visualViewport?.height ?? 0,
		visualViewportScale: window.visualViewport?.scale ?? 0,
		documentClientHeight: document.documentElement.clientHeight,
		documentScrollHeight: document.documentElement.scrollHeight,
		bodyClientHeight: document.body.clientHeight,
		bodyScrollHeight: document.body.scrollHeight,
		rootClientHeight: root?.clientHeight ?? 0,
		rootScrollHeight: root?.scrollHeight ?? 0,
		surfaceOffsetHeight: surface?.offsetHeight ?? 0,
		surfaceScrollHeight: surface?.scrollHeight ?? 0,
		contentOffsetHeight: content?.offsetHeight ?? 0,
		contentScrollHeight: content?.scrollHeight ?? 0,
		footerOffsetHeight: footer?.offsetHeight ?? 0,
		footerScrollHeight: footer?.scrollHeight ?? 0,
	})
}
