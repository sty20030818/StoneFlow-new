import {
	createContext,
	useCallback,
	useContext,
	useMemo,
	useReducer,
	type PropsWithChildren,
} from 'react'

import { closeSession, type LauncherCloseReason } from '../api/launcherApi'
import { useLauncherSessionBridge } from './sessionBridge'
import { createLauncherSessionState, LauncherSessionReducer } from './sessionReducer'
import type { LauncherSessionContextValue } from './sessionTypes'

const LauncherSessionContext = createContext<LauncherSessionContextValue | null>(null)

export function LauncherSessionProvider({ children }: PropsWithChildren) {
	const [state, dispatch] = useReducer(
		LauncherSessionReducer,
		undefined,
		createLauncherSessionState,
	)
	useLauncherSessionBridge(dispatch)

	const requestClose = useCallback(
		async (reason: LauncherCloseReason) => {
			const phase = state.phase
			if (phase.type !== 'visible' && phase.type !== 'presenting' && phase.type !== 'preparing') {
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
					message: error instanceof Error ? error.message : 'Launcher 关闭失败',
				})
			}
		},
		[state.phase],
	)

	const value = useMemo<LauncherSessionContextValue>(
		() => ({
			state,
			actions: {
				markPresenting: (sessionId) => {
					dispatch({ type: 'sessionPresenting', sessionId })
				},
				requestClose,
			},
		}),
		[requestClose, state],
	)

	return <LauncherSessionContext.Provider value={value}>{children}</LauncherSessionContext.Provider>
}

export function useLauncherSession() {
	const context = useContext(LauncherSessionContext)
	if (!context) {
		throw new Error('useLauncherSession 必须在 LauncherSessionProvider 内使用')
	}
	return context
}
