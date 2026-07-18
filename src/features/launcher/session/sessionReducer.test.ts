import { describe, expect, it } from 'vitest'

import {
	createLauncherSessionState,
	LauncherSessionReducer,
} from '@/features/launcher/session/sessionReducer'
import type { LauncherOpenSessionResponse } from '@/features/launcher/api/launcherApi'

const openContext: LauncherOpenSessionResponse = {
	sessionId: 'session-1',
	openedAt: '2026-07-18T00:00:00.000Z',
	currentScope: { type: 'space', spaceId: 'space-1' },
	defaultSpaceId: 'space-1',
	defaultPlacement: { kind: 'inbox', projectId: null },
	spaces: [],
	projects: [],
	recentTasks: [],
	recentProjects: [],
}

describe('LauncherSessionReducer', () => {
	it('frontendBooted 后进入 hidden', () => {
		const next = LauncherSessionReducer(createLauncherSessionState(), {
			type: 'frontendBooted',
		})
		expect(next.phase).toEqual({ type: 'hidden' })
	})

	it('prepared → presenting → visible 相位推进', () => {
		let state = LauncherSessionReducer(createLauncherSessionState(), {
			type: 'frontendBooted',
		})
		state = LauncherSessionReducer(state, {
			type: 'sessionPrepared',
			payload: openContext,
		})
		expect(state.phase.type).toBe('preparing')

		state = LauncherSessionReducer(state, {
			type: 'sessionPresenting',
			sessionId: 'session-1',
		})
		expect(state.phase.type).toBe('presenting')

		state = LauncherSessionReducer(state, {
			type: 'sessionPresented',
			sessionId: 'session-1',
		})
		expect(state.phase.type).toBe('visible')
		if (state.phase.type === 'visible') {
			expect(state.phase.openContext.sessionId).toBe('session-1')
		}
	})

	it('忽略已关闭 session 的迟到 prepared', () => {
		let state = LauncherSessionReducer(createLauncherSessionState(), {
			type: 'frontendBooted',
		})
		state = LauncherSessionReducer(state, {
			type: 'sessionPrepared',
			payload: openContext,
		})
		state = LauncherSessionReducer(state, {
			type: 'sessionClosing',
			sessionId: 'session-1',
			reason: 'escape',
		})
		state = LauncherSessionReducer(state, {
			type: 'sessionHidden',
			sessionId: 'session-1',
		})
		expect(state.phase.type).toBe('hidden')
		expect(state.closedSessionIds).toContain('session-1')

		const ignored = LauncherSessionReducer(state, {
			type: 'sessionPrepared',
			payload: openContext,
		})
		expect(ignored.phase.type).toBe('hidden')
	})

	it('sessionPresented 在错误相位时 noop', () => {
		let state = LauncherSessionReducer(createLauncherSessionState(), {
			type: 'frontendBooted',
		})
		state = LauncherSessionReducer(state, {
			type: 'sessionPrepared',
			payload: openContext,
		})
		const noop = LauncherSessionReducer(state, {
			type: 'sessionPresented',
			sessionId: 'session-1',
		})
		expect(noop.phase.type).toBe('preparing')
	})
})
