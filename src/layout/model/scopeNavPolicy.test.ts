import { describe, expect, it } from 'vitest'

import {
	isAllScope,
	isShellMainNavAllowed,
	shouldShowSidebarProjectSection,
} from './scopeNavPolicy'

describe('scopeNavPolicy', () => {
	it('识别 all scope', () => {
		expect(isAllScope({ type: 'all' })).toBe(true)
		expect(isAllScope({ type: 'space', spaceId: 's1' })).toBe(false)
	})

	it('All 下隐藏项目总览主导航，保留任务与视图', () => {
		const all = { type: 'all' as const }
		expect(isShellMainNavAllowed(all, 'tasks')).toBe(true)
		expect(isShellMainNavAllowed(all, 'views')).toBe(true)
		expect(isShellMainNavAllowed(all, 'projectOverview')).toBe(false)
	})

	it('单 Space 下允许全部主导航键', () => {
		const space = { type: 'space' as const, spaceId: 's1' }
		expect(isShellMainNavAllowed(space, 'projectOverview')).toBe(true)
	})

	it('项目列表区仅在单 Space 且 settings 可见时展示', () => {
		expect(shouldShowSidebarProjectSection({ type: 'all' }, true)).toBe(false)
		expect(shouldShowSidebarProjectSection({ type: 'space', spaceId: 's1' }, true)).toBe(true)
		expect(shouldShowSidebarProjectSection({ type: 'space', spaceId: 's1' }, false)).toBe(false)
	})
})
