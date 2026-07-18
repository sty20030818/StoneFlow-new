import type { LauncherCloseReason, LauncherOpenSessionResponse } from '../api/launcherApi'

export type LauncherSessionPhase =
	| { type: 'booting' }
	| { type: 'hidden' }
	| { type: 'preparing'; sessionId: string; openContext: LauncherOpenSessionResponse }
	| { type: 'presenting'; sessionId: string; openContext: LauncherOpenSessionResponse }
	| { type: 'visible'; sessionId: string; openContext: LauncherOpenSessionResponse }
	| { type: 'closing'; sessionId: string; reason: LauncherCloseReason }
	| { type: 'error'; sessionId?: string; message: string }

export type LauncherSessionState = {
	closedSessionIds: string[]
	phase: LauncherSessionPhase
}

export type LauncherSessionContextValue = {
	state: LauncherSessionState
	actions: {
		/** 前端已请求原生 show；等待 becameKey → session-presented */
		markPresenting: (sessionId: string) => void
		requestClose: (reason: import('../api/launcherApi').LauncherCloseReason) => Promise<void>
	}
}

export type LauncherSessionEventPayload = {
	sessionId: string
}

export type LauncherSessionClosePayload = {
	sessionId: string
	reason: LauncherCloseReason
}

export type LauncherSessionAction =
	| { type: 'frontendBooted' }
	| { type: 'sessionPrepared'; payload: LauncherOpenSessionResponse }
	| { type: 'sessionPresenting'; sessionId: string }
	| { type: 'sessionPresented'; sessionId: string }
	| { type: 'sessionClosing'; sessionId: string; reason: LauncherCloseReason }
	| { type: 'sessionHidden'; sessionId: string }
	| { type: 'sessionError'; sessionId?: string; message: string }
