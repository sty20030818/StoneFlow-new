import { parseShellRoute, parseShellScopePath, resolveShellSection } from './shellRoute'

describe('shellRoute settings paths', () => {
	it('识别 bare settings 与带分区路径', () => {
		const bareAll = parseShellRoute('/all/settings')
		expect(bareAll.isSettingsPath).toBe(true)
		expect(bareAll.section).toBe('settings')
		expect(bareAll.settingsSection).toBeNull()
		expect(bareAll.scope).toEqual({ type: 'all' })

		const syncAll = parseShellRoute('/all/settings/sync')
		expect(syncAll.isSettingsPath).toBe(true)
		expect(syncAll.settingsSection).toBe('sync')
		expect(syncAll.isShellPath).toBe(true)

		const generalSpace = parseShellRoute('/spaces/space-a/settings/general')
		expect(generalSpace.isSettingsPath).toBe(true)
		expect(generalSpace.settingsSection).toBe('general')
		expect(generalSpace.scope).toEqual({ type: 'space', spaceId: 'space-a' })
	})

	it('非法 settings section 仍标记为设置路径，settingsSection 为 null', () => {
		const invalid = parseShellRoute('/all/settings/billing')
		expect(invalid.isSettingsPath).toBe(true)
		expect(invalid.settingsSection).toBeNull()
		expect(resolveShellSection('/all/settings/billing')).toBe('settings')
	})

	it('settings 多段路径不识别为 shell settings', () => {
		const nested = parseShellRoute('/all/settings/sync/extra')
		expect(nested.isSettingsPath).toBe(false)
		expect(nested.kind).toBe('unknown')
	})

	it('parseShellScopePath 接受 settings 子路径', () => {
		expect(parseShellScopePath('/all/settings/update')).toEqual({ type: 'all' })
		expect(parseShellScopePath('/spaces/s1/settings/sidebar')).toEqual({
			type: 'space',
			spaceId: 's1',
		})
	})
})
