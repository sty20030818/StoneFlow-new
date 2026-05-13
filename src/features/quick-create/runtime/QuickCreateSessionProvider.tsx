import {
	createContext,
	useCallback,
	useContext,
	useEffect,
	useMemo,
	useReducer,
	useRef,
	type PropsWithChildren,
} from 'react'
import { listen } from '@tauri-apps/api/event'

import {
	getInitialState,
	notifyFrontendReady,
	notifyFrontendUnready,
} from '@/features/quick-create/api/quickCreate'
import type { QuickCreateInitialState } from '@/features/quick-create/model/types'

const QUICK_CREATE_PREPARE_EVENT = 'quick-create:prepare'
const QUICK_CREATE_PRESENTED_EVENT = 'quick-create:presented'

type QuickCreateSessionState = {
	isBootstrapping: boolean
	isPresentationPending: boolean
	initialState: QuickCreateInitialState | null
	layoutVersion: number
	errorMessage: string | null
}

type QuickCreateSessionContextValue = {
	state: QuickCreateSessionState
	actions: {
		fetchSnapshot: () => Promise<QuickCreateInitialState>
	}
}

type QuickCreateSessionAction =
	| { type: 'bootstrapStarted' }
	| { type: 'bootstrapSucceeded'; payload: QuickCreateInitialState }
	| { type: 'bootstrapFailed'; message: string }
	| { type: 'panelShownRefreshed'; payload: QuickCreateInitialState }
	| { type: 'presentationRequested' }
	| { type: 'presentationCompleted' }

const QuickCreateSessionContext = createContext<QuickCreateSessionContextValue | null>(null)

function createQuickCreateSessionState(): QuickCreateSessionState {
	return {
		isBootstrapping: true,
		isPresentationPending: false,
		initialState: null,
		layoutVersion: 0,
		errorMessage: null,
	}
}

function quickCreateSessionReducer(
	state: QuickCreateSessionState,
	action: QuickCreateSessionAction,
): QuickCreateSessionState {
	switch (action.type) {
		case 'bootstrapStarted':
			return {
				...state,
				isBootstrapping: true,
				errorMessage: null,
			}
		case 'bootstrapSucceeded':
			return {
				...state,
				isBootstrapping: false,
				initialState: action.payload,
				layoutVersion: state.layoutVersion + 1,
				errorMessage: null,
			}
		case 'bootstrapFailed':
			return {
				...state,
				isBootstrapping: false,
				errorMessage: action.message,
			}
		case 'panelShownRefreshed':
			return {
				...state,
				initialState: action.payload,
				layoutVersion: state.layoutVersion + 1,
				errorMessage: null,
			}
		case 'presentationRequested':
			return {
				...state,
				isPresentationPending: true,
			}
		case 'presentationCompleted':
			return {
				...state,
				isPresentationPending: false,
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
	const bootstrapRequestIdRef = useRef(0)
	const initialStateRef = useRef<QuickCreateInitialState | null>(null)

	useEffect(() => {
		initialStateRef.current = state.initialState
	}, [state.initialState])

	const loadInitialState = useCallback(async (mode: 'reset' | 'refreshShown') => {
		const requestId = ++bootstrapRequestIdRef.current

		if (mode === 'reset') {
			dispatch({ type: 'bootstrapStarted' })
		}

		try {
			const initialState = await getInitialState()
			if (requestId !== bootstrapRequestIdRef.current) {
				return
			}

			dispatch({
				type: mode === 'reset' ? 'bootstrapSucceeded' : 'panelShownRefreshed',
				payload: initialState,
			})
		} catch (error) {
			if (requestId !== bootstrapRequestIdRef.current) {
				return
			}

			dispatch({
				type: 'bootstrapFailed',
				message: error instanceof Error ? error.message : 'Quick Create 初始化失败',
			})
		}
	}, [])

	const fetchSnapshot = useCallback(async () => getInitialState(), [])

	useEffect(() => {
		void loadInitialState('reset')

		let disposed = false
		let unlistenPrepare: (() => void) | undefined
		let unlistenPresented: (() => void) | undefined

		const prepareListener = listen<void>(QUICK_CREATE_PREPARE_EVENT, () => {
			void (async () => {
				try {
					await loadInitialState(initialStateRef.current ? 'refreshShown' : 'reset')
					if (!disposed) {
						dispatch({ type: 'presentationRequested' })
					}
				} catch (error) {
					logQuickCreateSessionError(error)
				}
			})()
		})

		prepareListener
			.then((dispose) => {
				if (disposed) {
					dispose()
					return
				}
				unlistenPrepare = dispose
			})
			.catch((error) => {
				logQuickCreateSessionError(error)
			})

		const presentedListener = listen<void>(QUICK_CREATE_PRESENTED_EVENT, () => {
			dispatch({ type: 'presentationCompleted' })
		})

		presentedListener
			.then((dispose) => {
				if (disposed) {
					dispose()
					return
				}
				unlistenPresented = dispose
			})
			.catch((error) => {
				logQuickCreateSessionError(error)
			})

		Promise.all([prepareListener, presentedListener])
			.then(() => {
				if (disposed) {
					return
				}

				void notifyFrontendReady().catch(() => {
					// 预览环境或 helper 不可用时允许静默失败。
				})
			})
			.catch(() => {
				// 单个 listener 的失败已分别记录。
			})

		return () => {
			disposed = true
			unlistenPrepare?.()
			unlistenPresented?.()
			void notifyFrontendUnready().catch(() => {
				// 预览环境或 helper 不可用时允许静默失败。
			})
		}
	}, [loadInitialState])

	const value = useMemo<QuickCreateSessionContextValue>(
		() => ({
			state,
			actions: {
				fetchSnapshot,
			},
		}),
		[fetchSnapshot, state],
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
