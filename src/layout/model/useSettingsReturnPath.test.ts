import { describe, expect, it } from 'vitest'

import { resolveSettingsReturnPath } from './useSettingsReturnPath'

describe('resolveSettingsReturnPath', () => {
	it('接受可记忆的工作 path', () => {
		expect(resolveSettingsReturnPath('/all/inbox', { type: 'all' })).toBe('/all/inbox')
		expect(
			resolveSettingsReturnPath('/space-a/projects/p1', { type: 'space', spaceId: 'space-a' }),
		).toBe('/space-a/projects/p1')
	})

	it('拒绝 settings / launcher / 空 path，回落 startup fallback', () => {
		expect(resolveSettingsReturnPath('/all/settings/general', { type: 'all' })).toBe('/all/tasks')
		expect(resolveSettingsReturnPath('/launcher', { type: 'all' })).toBe('/all/tasks')
		expect(resolveSettingsReturnPath('  ', { type: 'all' })).toBe('/all/tasks')
		expect(resolveSettingsReturnPath(null, { type: 'space', spaceId: 'space-a' })).toBe(
			'/space-a/inbox',
		)
	})
})
