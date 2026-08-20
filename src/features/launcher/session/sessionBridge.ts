import { useEffect } from 'react'
import { listen } from '@tauri-apps/api/event'

import { notifyFrontendReady, type LauncherOpenSessionResponse } from '../api/launcherApi'
import type {
	LauncherSessionAction,
	LauncherSessionClosePayload,
	LauncherSessionEventPayload,
} from './sessionTypes'
import { applyAccentPreference } from '@/features/appearance'

const LAUNCHER_SESSION_PREPARED_EVENT = 'launcher:session-prepared'
const LAUNCHER_SESSION_PRESENTED_EVENT = 'launcher:session-presented'
const LAUNCHER_SESSION_INVALIDATED_EVENT = 'launcher:session-invalidated'

/**
 * 把原生窗事件与 frontend ready/unready 通知收口到 session bridge。
 * 关闭走 SessionProvider.requestClose → launcher_close_session。
 */
export function useLauncherSessionBridge(
	dispatch: React.ActionDispatch<[action: LauncherSessionAction]>,
) {
	useEffect(() => {
		dispatch({ type: 'frontendBooted' })

		let disposed = false
		let unlistenPrepared: (() => void) | undefined
		let unlistenPresented: (() => void) | undefined
		let unlistenInvalidated: (() => void) | undefined

		const preparedListener = listen<LauncherOpenSessionResponse>(
			LAUNCHER_SESSION_PREPARED_EVENT,
			(event) => {
				if (disposed) {
					return
				}
				applyAccentPreference()
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
			.catch(logLauncherSessionError)

		const presentedListener = listen<LauncherSessionEventPayload>(
			LAUNCHER_SESSION_PRESENTED_EVENT,
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
			.catch(logLauncherSessionError)

		const invalidatedListener = listen<LauncherSessionClosePayload>(
			LAUNCHER_SESSION_INVALIDATED_EVENT,
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
			.catch(logLauncherSessionError)

		Promise.all([preparedListener, presentedListener, invalidatedListener])
			.then(() => {
				if (disposed) {
					return
				}
				void notifyFrontendReady().catch(logLauncherSessionError)
			})
			.catch(logLauncherSessionError)

		return () => {
			disposed = true
			unlistenPrepared?.()
			unlistenPresented?.()
			unlistenInvalidated?.()
		}
	}, [dispatch])
}

function logLauncherSessionError(error: unknown) {
	if (error instanceof Error) {
		console.warn('[launcher] session runtime failed:', error.message)
		return
	}

	console.warn('[launcher] session runtime failed')
}
