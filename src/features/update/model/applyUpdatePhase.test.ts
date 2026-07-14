import { describe, expect, it, vi } from 'vitest'

import { applyUpdatePhaseEvent, type UpdatePhaseActions } from './applyUpdatePhase'

function makeActions(overrides: Partial<UpdatePhaseActions> = {}): UpdatePhaseActions {
	return {
		checkMode: 'notifyOnly',
		downloadUiAbandoned: false,
		showAvailable: vi.fn(),
		setDownloading: vi.fn(),
		setReady: vi.fn(),
		setError: vi.fn(),
		shouldToastReady: () => true,
		markReadyToasted: vi.fn(),
		...overrides,
	}
}

describe('applyUpdatePhaseEvent', () => {
	it('opens dialog for available in notifyOnly mode', () => {
		const actions = makeActions({ checkMode: 'notifyOnly' })
		applyUpdatePhaseEvent(
			{ phase: 'available', version: '1.2.0', body: 'notes', pubDate: null },
			actions,
		)
		expect(actions.showAvailable).toHaveBeenCalledWith(
			{ version: '1.2.0', body: 'notes', pubDate: null },
			{ openDialog: true },
		)
	})

	it('does not open dialog for available in autoDownload mode', () => {
		const actions = makeActions({ checkMode: 'autoDownload' })
		applyUpdatePhaseEvent({ phase: 'available', version: '1.2.0' }, actions)
		expect(actions.showAvailable).toHaveBeenCalledWith(
			expect.objectContaining({ version: '1.2.0' }),
			{ openDialog: false },
		)
	})

	it('ignores downloading when ui abandoned', () => {
		const actions = makeActions({ downloadUiAbandoned: true })
		const effect = applyUpdatePhaseEvent(
			{ phase: 'downloading', version: '1.2.0', downloaded: 10, total: 100 },
			actions,
		)
		expect(actions.setDownloading).not.toHaveBeenCalled()
		expect(effect).toBeNull()
	})

	it('sets downloading progress when active', () => {
		const actions = makeActions()
		applyUpdatePhaseEvent(
			{ phase: 'downloading', version: '1.2.0', downloaded: 10, total: 100 },
			actions,
		)
		expect(actions.setDownloading).toHaveBeenCalledWith({ downloaded: 10, total: 100 }, '1.2.0')
	})

	it('marks ready and returns toast side effect once', () => {
		const actions = makeActions({ shouldToastReady: () => true })
		const effect = applyUpdatePhaseEvent({ phase: 'ready', version: '1.2.0' }, actions)
		expect(actions.setReady).toHaveBeenCalledWith('1.2.0')
		expect(actions.markReadyToasted).toHaveBeenCalledWith('1.2.0')
		expect(effect).toEqual({ type: 'toast-ready', version: '1.2.0' })
	})

	it('returns error toast side effect', () => {
		const actions = makeActions()
		const effect = applyUpdatePhaseEvent({ phase: 'error', message: 'network' }, actions)
		expect(actions.setError).toHaveBeenCalledWith('network')
		expect(effect).toEqual({ type: 'toast-error', message: 'network' })
	})
})
