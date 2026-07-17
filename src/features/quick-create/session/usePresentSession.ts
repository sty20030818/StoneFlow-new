import { useEffect, useLayoutEffect, useRef } from 'react'

import { presentSession } from '@/features/quick-create/api/quickCreate'
import { useQuickCreateSession } from '@/features/quick-create/session/SessionProvider'
import type { QuickCreateSessionPhase } from '@/features/quick-create/session/sessionTypes'

/**
 * preparing → 请求原生 show；等待 becameKey 的 session-presented。
 * 不渲染 UI；窗尺寸由平台固定规格决定。
 */
export function PresentSession() {
	const { actions: sessionActions, state: sessionState } = useQuickCreateSession()
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

	return null
}

export function isPresentedSurfacePhase(phase: QuickCreateSessionPhase) {
	return phase.type === 'presenting' || phase.type === 'visible'
}

export function readActiveSessionId(phase: QuickCreateSessionPhase): string | null {
	return 'sessionId' in phase ? (phase.sessionId ?? null) : null
}
