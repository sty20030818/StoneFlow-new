import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import {
	presentWindow,
	reportLayoutDiagnostics,
	resizeWindow,
} from '@/features/quick-create/api/quickCreate'
import { useQuickCreateLayout } from '@/features/quick-create/layout/useQuickCreateLayout'
import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { useQuickCreateSession } from '@/features/quick-create/runtime/useQuickCreateSession'
import { QuickCreateFrame } from '@/features/quick-create/ui/QuickCreateFrame'

const QUICK_CREATE_MIN_WINDOW_HEIGHT = 364
const QUICK_CREATE_RESIZE_THRESHOLD = 2
const QUICK_CREATE_DPR_THRESHOLD = 0.001

type LastAppliedResize = {
	devicePixelRatio: number
	height: number
}

export function QuickCreateWindowShell() {
	const { derived, state } = useQuickCreate()
	const { state: sessionState } = useQuickCreateSession()
	const layout = useQuickCreateLayout(sessionState.layoutVersion)
	const [isWindowReady, setWindowReady] = useState(false)
	const viewportResizeRevision = useQuickCreateViewportResizeRevision(layout.requestMeasure)
	const lastAppliedResizeRef = useRef<LastAppliedResize | null>(null)
	const presentationSentRef = useRef(false)
	const lastLayoutVersionRef = useRef<number>(sessionState.layoutVersion)

	useLayoutEffect(() => {
		if (lastLayoutVersionRef.current !== sessionState.layoutVersion) {
			lastLayoutVersionRef.current = sessionState.layoutVersion
			lastAppliedResizeRef.current = null
			presentationSentRef.current = false
			setWindowReady(false)
		}
	}, [sessionState.layoutVersion])

	useEffect(() => {
		if (sessionState.isBootstrapping || !layout.isReady || layout.targetHeight === null) {
			return
		}

		const targetHeight = Math.max(layout.targetHeight, QUICK_CREATE_MIN_WINDOW_HEIGHT)
		const devicePixelRatio = readDevicePixelRatio()
		const lastAppliedResize = lastAppliedResizeRef.current

		if (
			lastAppliedResize !== null &&
			Math.abs(lastAppliedResize.height - targetHeight) < QUICK_CREATE_RESIZE_THRESHOLD &&
			Math.abs(lastAppliedResize.devicePixelRatio - devicePixelRatio) <
				QUICK_CREATE_DPR_THRESHOLD
		) {
			return
		}

		lastAppliedResizeRef.current = {
			devicePixelRatio,
			height: targetHeight,
		}

		void reportQuickCreateLayoutDiagnostics('before-resize', targetHeight, layout).catch(() => {
			// 诊断日志不能影响窗口呈现。
		})
		void resizeWindow(targetHeight)
			.catch(() => {
				// 预览环境或受限平台允许静默失败。
			})
			.finally(() => {
				setWindowReady(true)
				window.requestAnimationFrame(() => {
					void reportQuickCreateLayoutDiagnostics('after-resize', targetHeight, layout).catch(
						() => {
							// 诊断日志不能影响窗口呈现。
						},
					)
				})
			})
	}, [
		derived.continuousToastVisible,
		derived.displayProjects.length,
		derived.displayTasks.length,
		derived.isSearchEmpty,
		derived.isShowingRecent,
		layout,
		layout.isReady,
		layout.targetHeight,
		state.draft.title,
		state.isAdvancedOpen,
		sessionState.isBootstrapping,
		sessionState.layoutVersion,
		viewportResizeRevision,
	])

	useEffect(() => {
		if (
			!sessionState.isPresentationPending ||
			!isWindowReady ||
			presentationSentRef.current ||
			sessionState.isBootstrapping
		) {
			return
		}

		presentationSentRef.current = true
		void presentWindow().catch(() => {
			presentationSentRef.current = false
		})
	}, [isWindowReady, sessionState.isBootstrapping, sessionState.isPresentationPending])

	if (sessionState.isBootstrapping) {
		return <div className='flex h-full min-h-0 flex-1 bg-transparent' />
	}

	return <QuickCreateFrame isVisible={isWindowReady} layout={layout} />
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
