import type { AutosaveMachineEvent, AutosaveMachineState } from './autosaveTypes'

export const initialAutosaveMachineState: AutosaveMachineState = {
	status: 'idle',
	error: null,
	savedAt: null,
}

export function autosaveMachineReducer(
	state: AutosaveMachineState,
	event: AutosaveMachineEvent,
): AutosaveMachineState {
	switch (event.type) {
		case 'CHANGE_FIELD':
			return {
				...state,
				status: state.status === 'saving' ? 'saving' : 'dirty',
				error: null,
			}
		case 'SCHEDULE_SAVE':
			return {
				...state,
				status: state.status === 'saving' ? 'saving' : 'scheduled',
				error: null,
			}
		case 'FLUSH_NOW':
		case 'SAVE_START':
			return {
				...state,
				status: 'saving',
				error: null,
			}
		case 'SAVE_SUCCESS':
			return {
				status: 'saved',
				error: null,
				savedAt: event.savedAt ?? Date.now(),
			}
		case 'SAVE_FAILURE':
			return {
				...state,
				status: 'failed',
				error: event.error,
			}
		case 'RESET_FROM_REMOTE':
		case 'DISCARD':
			return initialAutosaveMachineState
		case 'RETRY':
			return state.status === 'failed'
				? {
						...state,
						status: 'saving',
						error: null,
					}
				: state
		case 'CLEAR_SAVED':
			return state.status === 'saved'
				? {
						...state,
						status: 'idle',
					}
				: state
		default:
			return state
	}
}
