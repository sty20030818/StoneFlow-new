import type {
	QuickCreateCloseReason,
	QuickCreateOpenSessionResponse,
} from '@/features/quick-create/api/quickCreate'

export type QuickCreateSessionPhase =
	| { type: 'booting' }
	| { type: 'hidden' }
	| { type: 'preparing'; sessionId: string; openContext: QuickCreateOpenSessionResponse }
	| { type: 'measuring'; sessionId: string; openContext: QuickCreateOpenSessionResponse }
	| { type: 'readyToPresent'; sessionId: string; openContext: QuickCreateOpenSessionResponse }
	| { type: 'visible'; sessionId: string; openContext: QuickCreateOpenSessionResponse }
	| { type: 'closing'; sessionId: string; reason: QuickCreateCloseReason }
	| { type: 'error'; sessionId?: string; message: string }

export type QuickCreateSessionState = {
	closedSessionIds: string[]
	phase: QuickCreateSessionPhase
}

export type QuickCreateSessionContextValue = {
	state: QuickCreateSessionState
	actions: {
		commitMeasured: (sessionId: string) => void
		markReadyToPresent: (sessionId: string) => void
		requestClose: (
			reason: import('@/features/quick-create/api/quickCreate').QuickCreateCloseReason,
		) => Promise<void>
	}
}

export type QuickCreateSessionEventPayload = {
	sessionId: string
}

export type QuickCreateSessionClosePayload = {
	sessionId: string
	reason: QuickCreateCloseReason
}

export type QuickCreateSessionAction =
	| { type: 'frontendBooted' }
	| { type: 'sessionPrepared'; payload: QuickCreateOpenSessionResponse }
	| { type: 'sessionMeasuring'; sessionId: string }
	| { type: 'sessionReadyToPresent'; sessionId: string }
	| { type: 'sessionPresented'; sessionId: string }
	| { type: 'sessionClosing'; sessionId: string; reason: QuickCreateCloseReason }
	| { type: 'sessionHidden'; sessionId: string }
	| { type: 'sessionError'; sessionId?: string; message: string }
