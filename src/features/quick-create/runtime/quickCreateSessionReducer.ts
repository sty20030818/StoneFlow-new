import type {
	QuickCreateSessionAction,
	QuickCreateSessionPhase,
	QuickCreateSessionState,
} from './quickCreateSessionTypes'

export function createQuickCreateSessionState(): QuickCreateSessionState {
	return {
		closedSessionIds: [],
		phase: { type: 'booting' },
	}
}

export function quickCreateSessionReducer(
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
			if (
				state.closedSessionIds.includes(action.payload.sessionId) ||
				matchesActiveSession(state.phase, action.payload.sessionId)
			) {
				return state
			}
			return {
				closedSessionIds: state.closedSessionIds,
				phase: {
					type: 'preparing',
					sessionId: action.payload.sessionId,
					openContext: action.payload,
				},
			}
		case 'sessionPresenting':
			if (state.phase.type !== 'preparing' || state.phase.sessionId !== action.sessionId) {
				return state
			}
			return {
				...state,
				phase: {
					type: 'presenting',
					sessionId: action.sessionId,
					openContext: state.phase.openContext,
				},
			}
		case 'sessionPresented':
			if (state.phase.type !== 'presenting' || state.phase.sessionId !== action.sessionId) {
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
			if (!matchesActiveSession(state.phase, action.sessionId)) {
				return state
			}
			return {
				...state,
				phase: {
					type: 'closing',
					sessionId: action.sessionId,
					reason: action.reason,
				},
			}
		case 'sessionHidden':
			if (matchesActiveSession(state.phase, action.sessionId)) {
				return {
					...state,
					closedSessionIds: rememberClosedSession(state.closedSessionIds, action.sessionId),
					phase: { type: 'hidden' },
				}
			}
			return state
		case 'sessionError':
			return {
				...state,
				closedSessionIds: action.sessionId
					? rememberClosedSession(state.closedSessionIds, action.sessionId)
					: state.closedSessionIds,
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

function matchesActiveSession(phase: QuickCreateSessionPhase, sessionId: string) {
	return 'sessionId' in phase && phase.sessionId === sessionId
}

function rememberClosedSession(closedSessionIds: string[], sessionId: string) {
	const next = [...closedSessionIds.filter((id) => id !== sessionId), sessionId]
	return next.slice(-8)
}
