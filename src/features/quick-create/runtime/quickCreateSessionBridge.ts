import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'

import {
	closeSession,
	notifyFrontendReady,
	notifyFrontendUnready,
	type QuickCreateOpenSessionResponse,
} from '@/features/quick-create/api/quickCreate'
import type {
	QuickCreateSessionAction,
	QuickCreateSessionClosePayload,
	QuickCreateSessionEventPayload,
} from '@/features/quick-create/runtime/quickCreateSessionTypes'

const QUICK_CREATE_SESSION_PREPARED_EVENT = 'quick-create:session-prepared'
const QUICK_CREATE_SESSION_PRESENTED_EVENT = 'quick-create:session-presented'
const QUICK_CREATE_SESSION_CLOSE_REQUESTED_EVENT = 'quick-create:session-close-requested'
const QUICK_CREATE_SESSION_INVALIDATED_EVENT = 'quick-create:session-invalidated'

/**
 * 把 runtime 事件监听与 frontend ready/unready 通知收口到 session bridge。
 * provider 只维护 session state，不再直接知道外部事件源。
 */
export function useQuickCreateSessionBridge(
	dispatch: React.ActionDispatch<[action: QuickCreateSessionAction]>,
) {
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
		preparedListener
			.then((dispose) => {
				if (disposed) {
					dispose()
					return
				}
				unlistenPrepared = dispose
			})
			.catch(logQuickCreateSessionError)

		const presentedListener = listen<QuickCreateSessionEventPayload>(
			QUICK_CREATE_SESSION_PRESENTED_EVENT,
			(event) => {
				if (disposed) {
					return
				}
				dispatch({ type: 'sessionPresented', sessionId: event.payload.sessionId })
			},
		)
		presentedListener
			.then((dispose) => {
				if (disposed) {
					dispose()
					return
				}
				unlistenPresented = dispose
			})
			.catch(logQuickCreateSessionError)

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
							message: error instanceof Error ? error.message : 'Quick Create 关闭失败',
						})
					})
			},
		)
		closeRequestedListener
			.then((dispose) => {
				if (disposed) {
					dispose()
					return
				}
				unlistenCloseRequested = dispose
			})
			.catch(logQuickCreateSessionError)

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
		invalidatedListener
			.then((dispose) => {
				if (disposed) {
					dispose()
					return
				}
				unlistenInvalidated = dispose
			})
			.catch(logQuickCreateSessionError)

		Promise.all([preparedListener, presentedListener, closeRequestedListener, invalidatedListener])
			.then(() => {
				if (disposed) {
					return
				}
				void notifyFrontendReady().catch(() => {})
			})
			.catch(() => {})

		return () => {
			disposed = true
			unlistenPrepared?.()
			unlistenPresented?.()
			unlistenCloseRequested?.()
			unlistenInvalidated?.()
			void notifyFrontendUnready().catch(() => {})
		}
	}, [dispatch])
}

function logQuickCreateSessionError(error: unknown) {
	if (error instanceof Error) {
		console.warn('[quick-create] session runtime failed:', error.message)
		return
	}

	console.warn('[quick-create] session runtime failed')
}
