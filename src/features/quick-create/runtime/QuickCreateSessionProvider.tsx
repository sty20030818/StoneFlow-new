import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
	type PropsWithChildren,
} from 'react'

import {
	closeSession,
	type QuickCreateCloseReason,
} from '@/features/quick-create/api/quickCreate'
import {
	createQuickCreateSessionState,
	quickCreateSessionReducer,
} from '@/features/quick-create/runtime/quickCreateSessionReducer'
import { useQuickCreateSessionBridge } from '@/features/quick-create/runtime/quickCreateSessionBridge'
import type {
	QuickCreateSessionContextValue,
} from '@/features/quick-create/runtime/quickCreateSessionTypes'

const QuickCreateSessionContext = createContext<QuickCreateSessionContextValue | null>(null)

export function QuickCreateSessionProvider({ children }: PropsWithChildren) {
	const [state, dispatch] = useReducer(
		quickCreateSessionReducer,
		undefined,
		createQuickCreateSessionState,
	)
	useQuickCreateSessionBridge(dispatch)

	const requestClose = useCallback(
		async (reason: QuickCreateCloseReason) => {
			const phase = state.phase
			if (
				phase.type !== 'visible' &&
				phase.type !== 'readyToPresent' &&
				phase.type !== 'measuring' &&
				phase.type !== 'preparing'
			) {
				return
			}

			dispatch({ type: 'sessionClosing', sessionId: phase.sessionId, reason })
			try {
				await closeSession({ sessionId: phase.sessionId, reason })
				dispatch({ type: 'sessionHidden', sessionId: phase.sessionId })
			} catch (error) {
				dispatch({
					type: 'sessionError',
					sessionId: phase.sessionId,
					message: error instanceof Error ? error.message : 'Quick Create 关闭失败',
				})
			}
		},
		[state.phase],
	)

	const value = useMemo<QuickCreateSessionContextValue>(
		() => ({
			state,
			actions: {
				commitMeasured: (sessionId) => {
					dispatch({ type: 'sessionMeasuring', sessionId })
				},
				markReadyToPresent: (sessionId) => {
					dispatch({ type: 'sessionReadyToPresent', sessionId })
				},
				requestClose,
			},
		}),
		[requestClose, state],
	)

	return (
		<QuickCreateSessionContext.Provider value={value}>
			{children}
		</QuickCreateSessionContext.Provider>
	)
}

export function useQuickCreateSession() {
	const context = useContext(QuickCreateSessionContext)
	if (!context) {
		throw new Error('useQuickCreateSession 必须在 QuickCreateSessionProvider 内使用')
	}
	return context
}
