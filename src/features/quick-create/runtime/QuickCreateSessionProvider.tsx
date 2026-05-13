import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	type PropsWithChildren,
} from 'react'
import { listen } from '@tauri-apps/api/event'

import {
	closeSession,
	type QuickCreateCloseReason,
	type QuickCreateOpenSessionResponse,
	notifyFrontendReady,
	notifyFrontendUnready,
} from '@/features/quick-create/api/quickCreate'

const QUICK_CREATE_SESSION_PREPARED_EVENT = 'quick-create:session-prepared'
const QUICK_CREATE_SESSION_PRESENTED_EVENT = 'quick-create:session-presented'
const QUICK_CREATE_SESSION_CLOSE_REQUESTED_EVENT = 'quick-create:session-close-requested'
const QUICK_CREATE_SESSION_INVALIDATED_EVENT = 'quick-create:session-invalidated'

type QuickCreateSessionPhase =
	| { type: 'booting' }
	| { type: 'hidden' }
	| { type: 'preparing'; sessionId: string; openContext: QuickCreateOpenSessionResponse }
	| { type: 'measuring'; sessionId: string; openContext: QuickCreateOpenSessionResponse }
	| { type: 'readyToPresent'; sessionId: string; openContext: QuickCreateOpenSessionResponse }
	| { type: 'visible'; sessionId: string; openContext: QuickCreateOpenSessionResponse }
	| { type: 'closing'; sessionId: string; reason: QuickCreateCloseReason }
	| { type: 'error'; sessionId?: string; message: string }

type QuickCreateSessionState = {
	phase: QuickCreateSessionPhase
	layoutVersion: number
}

type QuickCreateSessionContextValue = {
	state: QuickCreateSessionState
	actions: {
		commitMeasured: (sessionId: string) => void
		markReadyToPresent: (sessionId: string) => void
		requestClose: (reason: QuickCreateCloseReason) => Promise<void>
	}
}

type QuickCreateSessionEventPayload = {
	sessionId: string
}

type QuickCreateSessionClosePayload = {
	sessionId: string
	reason: QuickCreateCloseReason
}

type QuickCreateSessionAction =
	| { type: 'frontendBooted' }
	| { type: 'sessionPrepared'; payload: QuickCreateOpenSessionResponse }
	| { type: 'sessionMeasuring'; sessionId: string }
	| { type: 'sessionReadyToPresent'; sessionId: string }
	| { type: 'sessionPresented'; sessionId: string }
	| { type: 'sessionClosing'; sessionId: string; reason: QuickCreateCloseReason }
	| { type: 'sessionHidden'; sessionId: string }
	| { type: 'sessionError'; sessionId?: string; message: string }

const QuickCreateSessionContext = createContext<QuickCreateSessionContextValue | null>(null)

function createQuickCreateSessionState(): QuickCreateSessionState {
	return {
		phase: { type: 'booting' },
		layoutVersion: 0,
	}
}

function quickCreateSessionReducer(
	state: QuickCreateSessionState,
	action: QuickCreateSessionAction,
): QuickCreateSessionState {
	switch (action.type) {
		case 'frontendBooted':
			return {
				...state,
				phase: { type: 'hidden' },
			}
		case 'sessionPrepared':
			return {
				layoutVersion: state.layoutVersion + 1,
				phase: {
					type: 'preparing',
					sessionId: action.payload.sessionId,
					openContext: action.payload,
				},
			}
		case 'sessionMeasuring':
			if (
				state.phase.type !== 'preparing' ||
				state.phase.sessionId !== action.sessionId
			) {
				return state
			}
			return {
				...state,
				phase: {
					type: 'measuring',
					sessionId: action.sessionId,
					openContext: state.phase.openContext,
				},
			}
		case 'sessionReadyToPresent':
			if (
				state.phase.type !== 'measuring' ||
				state.phase.sessionId !== action.sessionId
			) {
				return state
			}
			return {
				...state,
				phase: {
					type: 'readyToPresent',
					sessionId: action.sessionId,
					openContext: state.phase.openContext,
				},
			}
		case 'sessionPresented':
			if (
				state.phase.type !== 'readyToPresent' ||
				state.phase.sessionId !== action.sessionId
			) {
				return state
			}
			return {
				...state,
				phase: {
					type: 'visible',
					sessionId: action.sessionId,
					openContext: state.phase.openContext,
				},
			}
		case 'sessionClosing':
			return {
				...state,
				phase: {
					type: 'closing',
					sessionId: action.sessionId,
					reason: action.reason,
				},
			}
		case 'sessionHidden':
			if (
				state.phase.type === 'closing' &&
				state.phase.sessionId === action.sessionId
			) {
				return {
					...state,
					phase: { type: 'hidden' },
				}
			}
			return state
		case 'sessionError':
			return {
				...state,
				phase: {
					type: 'error',
					sessionId: action.sessionId,
					message: action.message,
				},
			}
		default:
			return state
	}
}

export function QuickCreateSessionProvider({ children }: PropsWithChildren) {
	const [state, dispatch] = useReducer(
		quickCreateSessionReducer,
		undefined,
		createQuickCreateSessionState,
	)

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

	useEffect(() => {
		dispatch({ type: 'frontendBooted' })

		let disposed = false
		let unlistenPrepared: (() => void) | undefined
		let unlistenPresented: (() => void) | undefined
		let unlistenCloseRequested: (() => void) | undefined
		let unlistenInvalidated: (() => void) | undefined

		const preparedListener = listen<QuickCreateOpenSessionResponse>(
			QUICK_CREATE_SESSION_PREPARED_EVENT,
			(event) => {
				if (disposed) {
					return
				}
				dispatch({ type: 'sessionPrepared', payload: event.payload })
			},
		)
		preparedListener.then((dispose) => {
			if (disposed) {
				dispose()
				return
			}
			unlistenPrepared = dispose
		}).catch(logQuickCreateSessionError)

		const presentedListener = listen<QuickCreateSessionEventPayload>(
			QUICK_CREATE_SESSION_PRESENTED_EVENT,
			(event) => {
				if (disposed) {
					return
				}
				dispatch({ type: 'sessionPresented', sessionId: event.payload.sessionId })
			},
		)
		presentedListener.then((dispose) => {
			if (disposed) {
				dispose()
				return
			}
			unlistenPresented = dispose
		}).catch(logQuickCreateSessionError)

		const closeRequestedListener = listen<QuickCreateSessionClosePayload>(
			QUICK_CREATE_SESSION_CLOSE_REQUESTED_EVENT,
			(event) => {
				if (disposed) {
					return
				}

				const { reason, sessionId } = event.payload
				dispatch({ type: 'sessionClosing', sessionId, reason })
				void closeSession({ sessionId, reason })
					.then(() => {
						if (disposed) {
							return
						}
						dispatch({ type: 'sessionHidden', sessionId })
					})
					.catch((error) => {
						if (disposed) {
							return
						}
						dispatch({
							type: 'sessionError',
							sessionId,
							message:
								error instanceof Error ? error.message : 'Quick Create 关闭失败',
						})
					})
			},
		)
		closeRequestedListener.then((dispose) => {
			if (disposed) {
				dispose()
				return
			}
			unlistenCloseRequested = dispose
		}).catch(logQuickCreateSessionError)

		const invalidatedListener = listen<QuickCreateSessionClosePayload>(
			QUICK_CREATE_SESSION_INVALIDATED_EVENT,
			(event) => {
				if (disposed) {
					return
				}

				dispatch({
					type: 'sessionClosing',
					sessionId: event.payload.sessionId,
					reason: event.payload.reason,
				})
				dispatch({ type: 'sessionHidden', sessionId: event.payload.sessionId })
			},
		)
		invalidatedListener.then((dispose) => {
			if (disposed) {
				dispose()
				return
			}
			unlistenInvalidated = dispose
		}).catch(logQuickCreateSessionError)

		Promise.all([
			preparedListener,
			presentedListener,
			closeRequestedListener,
			invalidatedListener,
		])
			.then(() => {
				if (disposed) {
					return
				}
				void notifyFrontendReady().catch(() => {
					// helper 不可用时允许静默失败。
				})
			})
			.catch(() => {})

		return () => {
			disposed = true
			unlistenPrepared?.()
			unlistenPresented?.()
			unlistenCloseRequested?.()
			unlistenInvalidated?.()
			void notifyFrontendUnready().catch(() => {
				// helper 不可用时允许静默失败。
			})
		}
	}, [])

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

function logQuickCreateSessionError(error: unknown) {
	if (error instanceof Error) {
		console.warn('[quick-create] session runtime failed:', error.message)
		return
	}

	console.warn('[quick-create] session runtime failed')
}
