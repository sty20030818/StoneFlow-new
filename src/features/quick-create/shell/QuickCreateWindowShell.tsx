import { useEffect, useLayoutEffect, useRef, useState } from 'react'

import {
	presentWindow,
	reportLayoutDiagnostics,
	resizeWindow,
} from '@/features/quick-create/api/quickCreate'
import { useQuickCreateLayout } from '@/features/quick-create/layout/useQuickCreateLayout'
import { useQuickCreate } from '@/features/quick-create/model/QuickCreateProvider'
import { QuickCreateFrame } from '@/features/quick-create/ui/QuickCreateFrame'

const QUICK_CREATE_MIN_WINDOW_HEIGHT = 364
const QUICK_CREATE_RESIZE_THRESHOLD = 2

export function QuickCreateWindowShell() {
	const { derived, state } = useQuickCreate()
	const layout = useQuickCreateLayout(state.layoutVersion)
	const [isWindowReady, setWindowReady] = useState(false)
	const lastAppliedHeightRef = useRef<number | null>(null)
	const presentationSentRef = useRef(false)
	const lastLayoutVersionRef = useRef<number>(state.layoutVersion)

	useLayoutEffect(() => {
		if (lastLayoutVersionRef.current !== state.layoutVersion) {
			lastLayoutVersionRef.current = state.layoutVersion
			lastAppliedHeightRef.current = null
			presentationSentRef.current = false
			setWindowReady(false)
		}
	}, [state.layoutVersion])

	useEffect(() => {
		if (state.isBootstrapping || !layout.isReady || layout.targetHeight === null) {
			return
		}

		const targetHeight = Math.max(layout.targetHeight, QUICK_CREATE_MIN_WINDOW_HEIGHT)

		if (
			lastAppliedHeightRef.current !== null &&
			Math.abs(lastAppliedHeightRef.current - targetHeight) < QUICK_CREATE_RESIZE_THRESHOLD
		) {
			return
		}

		lastAppliedHeightRef.current = targetHeight

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
		layout.isReady,
		layout.targetHeight,
		state.draft.title,
		state.isAdvancedOpen,
		state.isBootstrapping,
		state.layoutVersion,
	])

	useEffect(() => {
		if (
			!state.isPresentationPending ||
			!isWindowReady ||
			presentationSentRef.current ||
			state.isBootstrapping
		) {
			return
		}

		presentationSentRef.current = true
		void presentWindow().catch(() => {
			presentationSentRef.current = false
		})
	}, [isWindowReady, state.isBootstrapping, state.isPresentationPending])

	if (state.isBootstrapping) {
		return <div className='flex h-full min-h-0 flex-1 bg-transparent' />
	}

	return <QuickCreateFrame isVisible={isWindowReady} layout={layout} />
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
