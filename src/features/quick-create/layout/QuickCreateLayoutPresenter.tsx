import { useEffect, useLayoutEffect, useRef } from 'react'

import { presentSession } from '@/features/quick-create/api/quickCreate'
import { QuickCreateFrame } from '@/features/quick-create/components/QuickCreateFrame'
import { useQuickCreateLayout } from '@/features/quick-create/layout/useQuickCreateLayout'
import { useQuickCreateSession } from '@/features/quick-create/runtime/useQuickCreateSession'
import type { QuickCreateSessionPhase } from '@/features/quick-create/runtime/quickCreateSessionTypes'

/**
 * 编排 present：收到 preparing 后请求原生 show，等待 becameKey 的 session-presented。
 * 窗口高度由平台固定尺寸决定，不再测高或 commitLayout。
 */
export function QuickCreateLayoutPresenter() {
	const { actions: sessionActions, state: sessionState } = useQuickCreateSession()
	const measureKey =
		'openContext' in sessionState.phase ? sessionState.phase.sessionId : sessionState.phase.type
	// 仍挂 region ref 供 Frame 装配；测量结果不再驱动窗口高度。
	const layout = useQuickCreateLayout(measureKey)
	const presentationSentRef = useRef(false)
	const lastSessionIdRef = useRef<string | null>(null)
	const activeSessionId = readActiveSessionId(sessionState.phase)

	useLayoutEffect(() => {
		if (lastSessionIdRef.current !== activeSessionId) {
			lastSessionIdRef.current = activeSessionId
			presentationSentRef.current = false
		}
	}, [activeSessionId])

	useEffect(() => {
		if (sessionState.phase.type !== 'preparing' || presentationSentRef.current) {
			return
		}

		const sessionId = sessionState.phase.sessionId
		presentationSentRef.current = true
		sessionActions.markPresenting(sessionId)
		void presentSession({ sessionId }).catch(() => {
			presentationSentRef.current = false
		})
	}, [sessionActions, sessionState.phase])

	const isVisible = isPresentedSurfacePhase(sessionState.phase) && activeSessionId !== null

	return (
		<QuickCreateFrame
			isVisible={isVisible}
			layout={layout}
			onRequestClose={() => {
				void sessionActions.requestClose('blur')
			}}
		/>
	)
}

function isPresentedSurfacePhase(phase: QuickCreateSessionPhase) {
	return phase.type === 'presenting' || phase.type === 'visible'
}

function readActiveSessionId(phase: QuickCreateSessionPhase): string | null {
	return 'sessionId' in phase ? (phase.sessionId ?? null) : null
}
