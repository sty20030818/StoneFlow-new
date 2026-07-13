import {
	DEFAULT_SETTINGS_SECTION,
	isSettingsSectionKey,
	parseSettingsSectionKey,
	resolveSettingsSectionKey,
	SETTINGS_SECTION_KEYS,
} from './settingsSection'

describe('settingsSection', () => {
	it('暴露 V1 四分区与默认 general', () => {
		expect(SETTINGS_SECTION_KEYS).toEqual(['general', 'sidebar', 'sync', 'update'])
		expect(DEFAULT_SETTINGS_SECTION).toBe('general')
	})

	it('校验与解析 section key', () => {
		expect(isSettingsSectionKey('sync')).toBe(true)
		expect(isSettingsSectionKey('billing')).toBe(false)
		expect(parseSettingsSectionKey('sidebar')).toBe('sidebar')
		expect(parseSettingsSectionKey('nope')).toBeNull()
		expect(parseSettingsSectionKey(undefined)).toBeNull()
	})

	it('非法值 resolve 到默认分区', () => {
		expect(resolveSettingsSectionKey('update')).toBe('update')
		expect(resolveSettingsSectionKey('unknown')).toBe('general')
		expect(resolveSettingsSectionKey(null)).toBe('general')
	})
})
