import { describe, expect, it } from 'vitest'

import { formatLauncherShortcut, matchLauncherShortcut } from './launcherShortcutKeymap'

const baseEvent = {
	key: '',
	metaKey: false,
	ctrlKey: false,
	shiftKey: false,
}

describe('launcherShortcutKeymap', () => {
	it.each([
		['ArrowUp', 'selectPrevious'],
		['ArrowDown', 'selectNext'],
		['Enter', 'confirm'],
		['Escape', 'clearOrClose'],
	] as const)('将 %s 匹配到 %s', (key, expected) => {
		expect(matchLauncherShortcut({ ...baseEvent, key }, { platform: 'windows' })).toBe(expected)
	})

	it('按平台匹配 Mod+Enter，并优先于 Shift+Enter 与 Enter', () => {
		expect(
			matchLauncherShortcut(
				{ ...baseEvent, key: 'Enter', metaKey: true, shiftKey: true },
				{ platform: 'mac' },
			),
		).toBe('createAndOpen')
		expect(
			matchLauncherShortcut(
				{ ...baseEvent, key: 'Enter', ctrlKey: true, shiftKey: true },
				{ platform: 'windows' },
			),
		).toBe('createAndOpen')
		expect(
			matchLauncherShortcut({ ...baseEvent, key: 'Enter', ctrlKey: true }, { platform: 'mac' }),
		).toBe('confirm')
	})

	it('将 Shift+Enter 匹配到连续创建', () => {
		expect(
			matchLauncherShortcut(
				{ ...baseEvent, key: 'Enter', shiftKey: true },
				{ platform: 'windows' },
			),
		).toBe('createAndContinue')
	})

	it('会跳过当前不可用的组合动作并回退到 Enter', () => {
		expect(
			matchLauncherShortcut(
				{ ...baseEvent, key: 'Enter', ctrlKey: true, shiftKey: true },
				{
					platform: 'windows',
					isEnabled: (id) => id !== 'createAndOpen' && id !== 'createAndContinue',
				},
			),
		).toBe('confirm')
	})

	it('从同一 binding 生成平台化页脚文案', () => {
		expect(formatLauncherShortcut('selectPrevious', 'windows')).toBe('↑')
		expect(formatLauncherShortcut('selectNext', 'windows')).toBe('↓')
		expect(formatLauncherShortcut('createAndContinue', 'windows')).toBe('⇧↵')
		expect(formatLauncherShortcut('createAndOpen', 'mac')).toBe('⌘↵')
		expect(formatLauncherShortcut('createAndOpen', 'windows')).toBe('Ctrl+↵')
		expect(formatLauncherShortcut('clearOrClose', 'linux')).toBe('Esc')
	})
})
