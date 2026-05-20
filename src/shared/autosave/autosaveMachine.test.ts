import {
	autosaveMachineReducer,
	initialAutosaveMachineState,
} from './autosaveMachine'

describe('autosaveMachineReducer', () => {
	it('支持 idle -> dirty -> scheduled -> saving -> saved -> idle', () => {
		const dirty = autosaveMachineReducer(initialAutosaveMachineState, {
			type: 'CHANGE_FIELD',
		})
		const scheduled = autosaveMachineReducer(dirty, { type: 'SCHEDULE_SAVE' })
		const saving = autosaveMachineReducer(scheduled, { type: 'SAVE_START' })
		const saved = autosaveMachineReducer(saving, { type: 'SAVE_SUCCESS', savedAt: 100 })
		const idle = autosaveMachineReducer(saved, { type: 'CLEAR_SAVED' })

		expect(dirty.status).toBe('dirty')
		expect(scheduled.status).toBe('scheduled')
		expect(saving.status).toBe('saving')
		expect(saved).toEqual({ status: 'saved', error: null, savedAt: 100 })
		expect(idle).toEqual({ status: 'idle', error: null, savedAt: 100 })
	})

	it('支持 saving -> failed', () => {
		const saving = autosaveMachineReducer(initialAutosaveMachineState, {
			type: 'SAVE_START',
		})
		const failed = autosaveMachineReducer(saving, {
			type: 'SAVE_FAILURE',
			error: 'boom',
		})

		expect(failed.status).toBe('failed')
		expect(failed.error).toBe('boom')
	})

	it('支持 failed -> retry -> saving', () => {
		const failed = autosaveMachineReducer(initialAutosaveMachineState, {
			type: 'SAVE_FAILURE',
			error: 'boom',
		})
		const retrying = autosaveMachineReducer(failed, { type: 'RETRY' })

		expect(retrying.status).toBe('saving')
		expect(retrying.error).toBeNull()
	})

	it('reset 与 discard 会回到 idle', () => {
		const dirty = autosaveMachineReducer(initialAutosaveMachineState, {
			type: 'CHANGE_FIELD',
		})

		expect(autosaveMachineReducer(dirty, { type: 'RESET_FROM_REMOTE' })).toEqual(
			initialAutosaveMachineState,
		)
		expect(autosaveMachineReducer(dirty, { type: 'DISCARD' })).toEqual(
			initialAutosaveMachineState,
		)
	})
})
