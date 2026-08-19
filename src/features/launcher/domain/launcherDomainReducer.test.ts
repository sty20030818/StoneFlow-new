import { describe, expect, it } from 'vitest'

import { createLauncherInitialState, launcherDomainReducer } from './launcherDomainReducer'
import type { LauncherAction } from './launcherDomainTypes'
import type { LauncherOpenContext } from '../model/types'

function openSession(
	overrides: Partial<LauncherOpenContext> = {},
): Extract<LauncherAction, { type: 'sessionOpened' }> {
	return {
		type: 'sessionOpened',
		payload: {
			currentScope: { type: 'space', spaceId: 'space-1' },
			defaultSpaceId: 'space-1',
			defaultPlacement: { kind: 'standalone', projectId: null },
			spaces: [
				{ id: 'space-1', name: '工作', iconKey: 'briefcase', colorKey: 'blue', isDefault: true },
			],
			projects: [
				{ kind: 'standalone', id: null, name: '独立事项', spaceId: 'space-1' },
				{ kind: 'project', id: 'project-1', name: '项目 A', spaceId: 'space-1' },
			],
			...overrides,
		},
	}
}

describe('launcherDomainReducer', () => {
	it('sessionOpened 首次打开会写入默认 space/placement', () => {
		const next = launcherDomainReducer(createLauncherInitialState(), openSession())

		expect(next.draft.spaceId).toBe('space-1')
		expect(next.draft.placement).toEqual({ kind: 'standalone', projectId: null })
		expect(next.searchView).toBe('recent')
		expect(next.focusTarget).toBe('none')
	})

	it('titleChanged 有标题时聚焦 create，清空标题时失焦', () => {
		let state = launcherDomainReducer(createLauncherInitialState(), openSession())
		state = launcherDomainReducer(state, { type: 'titleChanged', title: '记一事' })

		expect(state.draft.title).toBe('记一事')
		expect(state.focusTarget).toBe('create')

		state = launcherDomainReducer(state, { type: 'titleChanged', title: '  ' })
		expect(state.focusTarget).toBe('none')
	})

	it('searchSucceeded 按命中切换 results / empty', () => {
		let state = launcherDomainReducer(createLauncherInitialState(), openSession())
		state = launcherDomainReducer(state, {
			type: 'searchSucceeded',
			payload: {
				tasks: [
					{
						id: 't1',
						spaceId: 'space-1',
						spaceName: '工作',
						projectId: null,
						projectName: null,
						title: '命中',
						note: null,
						priority: 0,
						status: 'todo',
						updatedAt: '2026-01-01T00:00:00.000Z',
						completedAt: null,
					},
				],
				projects: [],
			},
		})
		expect(state.searchView).toBe('results')

		state = launcherDomainReducer(state, {
			type: 'searchSucceeded',
			payload: { tasks: [], projects: [] },
		})
		expect(state.searchView).toBe('empty')
	})

	it('focusChanged 可在 create 与 result index 间切换', () => {
		let state = launcherDomainReducer(createLauncherInitialState(), openSession())
		state = launcherDomainReducer(state, { type: 'titleChanged', title: 'x' })
		state = launcherDomainReducer(state, {
			type: 'focusChanged',
			focusTarget: { kind: 'result', index: 0 },
		})
		expect(state.focusTarget).toEqual({ kind: 'result', index: 0 })

		state = launcherDomainReducer(state, {
			type: 'focusChanged',
			focusTarget: 'create',
		})
		expect(state.focusTarget).toBe('create')
	})

	it('切换 Space 时重置为独立事项并开始加载新项目', () => {
		let state = launcherDomainReducer(createLauncherInitialState(), openSession())
		state = launcherDomainReducer(state, {
			type: 'placementChanged',
			placement: { kind: 'project', projectId: 'project-1' },
		})
		state = launcherDomainReducer(state, { type: 'projectSearchChanged', query: '项目 A' })

		const next = launcherDomainReducer(state, { type: 'spaceChanged', spaceId: 'space-2' })

		expect(next.draft.spaceId).toBe('space-2')
		expect(next.draft.placement).toEqual({ kind: 'standalone', projectId: null })
		expect(next.projectSearch).toBe('')
		expect(next.isProjectOptionsLoading).toBe(true)
	})

	it('continuousCreateSucceeded 只清空标题，保留下一条的属性并累计计数', () => {
		let state = launcherDomainReducer(createLauncherInitialState(), openSession())
		state = launcherDomainReducer(state, { type: 'titleChanged', title: '连续' })
		state = launcherDomainReducer(state, { type: 'priorityChanged', priority: 4 })
		state = launcherDomainReducer(state, { type: 'statusChanged', status: 'done' })
		state = launcherDomainReducer(state, {
			type: 'dateChanged',
			field: 'dueAt',
			value: '2026-08-20',
		})
		state = launcherDomainReducer(state, {
			type: 'continuousCreateSucceeded',
			message: '已创建',
		})

		expect(state.draft).toMatchObject({
			title: '',
			priority: 4,
			status: 'done',
			dueAt: '2026-08-20',
		})
		expect(state.focusTarget).toBe('none')
		expect(state.searchView).toBe('recent')
		expect(state.continuousCreateCount).toBe(1)
		expect(state.message).toBe('已创建')
	})
})
