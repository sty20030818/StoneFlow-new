import {
	readLastSettingsSection,
	writeLastSettingsSection,
} from '@/features/settings/model/lastSettingsSection'

describe('lastSettingsSection', () => {
	beforeEach(() => {
		sessionStorage.clear()
	})

	it('默认返回 general', () => {
		expect(readLastSettingsSection()).toBe('general')
	})

	it('读写合法分区', () => {
		writeLastSettingsSection('sync')
		expect(readLastSettingsSection()).toBe('sync')
	})

	it('忽略非法值', () => {
		sessionStorage.setItem('stoneflow.settings.lastSection', 'billing')
		expect(readLastSettingsSection()).toBe('general')
	})
})
