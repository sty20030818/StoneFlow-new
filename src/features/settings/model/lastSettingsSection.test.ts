import { openSettings } from '@/app/navigation'

import { readLastSettingsSection, writeLastSettingsSection } from '@/features/settings/contract'

describe('lastSettingsSection', () => {
	beforeEach(() => {
		sessionStorage.clear()
		localStorage.clear()
	})

	it('默认返回 general', () => {
		expect(readLastSettingsSection()).toBe('general')
	})

	it('读写合法分区（localStorage）', () => {
		writeLastSettingsSection('sync')
		expect(readLastSettingsSection()).toBe('sync')
		expect(localStorage.getItem('stoneflow.settings.lastSection')).toBe('sync')
	})

	it('忽略非法值并回落 memory/default', () => {
		writeLastSettingsSection('update')
		localStorage.setItem('stoneflow.settings.lastSection', 'billing')
		sessionStorage.setItem('stoneflow.settings.lastSection', 'billing')
		// memory 仍保留上次合法写入
		expect(readLastSettingsSection()).toBe('update')
	})

	it('openSettings 路径应带上 last section', () => {
		writeLastSettingsSection('update')
		expect(openSettings({ type: 'all' })).toBe('/all/settings/update')
		expect(openSettings({ type: 'space', spaceId: 'space-a' })).toBe('/space-a/settings/update')
	})
})
