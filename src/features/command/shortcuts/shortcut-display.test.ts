import { COMMAND_IDS } from '@/features/command/core'
import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	type Keybinding,
} from '@/features/command/keybinding'

import { getShortcutAccessibilityLabel, resolveCommandShortcut } from './shortcut-display'

const baseQuery = {
	registry: new KeybindingRegistry(DEFAULT_KEYBINDINGS),
	scope: 'global',
	platform: 'mac',
} as const

describe('resolveCommandShortcut', () => {
	it('primary 明确返回主快捷键，不受 alternative 声明位置影响', () => {
		expect(
			resolveCommandShortcut({
				...baseQuery,
				commandId: COMMAND_IDS.openSettings,
				mode: 'primary',
			}),
		).toEqual([
			{ type: 'key', value: '⌘' },
			{ type: 'key', value: ',' },
		])
	})

	it('all 返回主快捷键与全部备选快捷键', () => {
		expect(
			resolveCommandShortcut({
				...baseQuery,
				commandId: COMMAND_IDS.openSettings,
				mode: 'all',
			}),
		).toEqual([
			[
				{ type: 'key', value: '⌘' },
				{ type: 'key', value: ',' },
			],
			[
				{ type: 'key', value: 'G' },
				{ type: 'separator', value: '→' },
				{ type: 'key', value: 'S' },
			],
		])
	})

	it('按平台格式化 mod，且 chord 使用箭头 token', () => {
		expect(
			resolveCommandShortcut({
				...baseQuery,
				platform: 'windows',
				commandId: COMMAND_IDS.openCommandMenu,
				mode: 'primary',
			}),
		).toEqual([
			{ type: 'key', value: 'Ctrl' },
			{ type: 'key', value: 'K' },
		])
		expect(
			resolveCommandShortcut({
				...baseQuery,
				commandId: COMMAND_IDS.goStandalone,
				mode: 'primary',
			}),
		).toEqual([
			{ type: 'key', value: 'G' },
			{ type: 'separator', value: '→' },
			{ type: 'key', value: 'I' },
		])
	})

	it('未绑定与已移除的未接入命令不暴露快捷键', () => {
		expect(
			resolveCommandShortcut({
				...baseQuery,
				commandId: 'test.unbound',
				mode: 'primary',
			}),
		).toBeNull()
		expect(
			resolveCommandShortcut({
				...baseQuery,
				commandId: COMMAND_IDS.openSpace,
				mode: 'primary',
			}),
		).toBeNull()
	})

	it('hidden 运行时绑定不暴露快捷键', () => {
		const hiddenBinding: Keybinding = {
			commandId: 'test.runtimeOnly',
			sequence: [{ key: 'h' }],
			scope: 'global',
			display: 'hidden',
			preventDefault: false,
			allowInEditable: false,
		}
		const registry = new KeybindingRegistry([hiddenBinding])

		expect(
			resolveCommandShortcut({
				registry,
				commandId: hiddenBinding.commandId,
				scope: 'global',
				platform: 'mac',
				mode: 'primary',
			}),
		).toBeNull()
	})
})

describe('getShortcutAccessibilityLabel', () => {
	it('明确区分同时按键与依次输入 chord', () => {
		expect(
			getShortcutAccessibilityLabel([
				{ type: 'key', value: '⌘' },
				{ type: 'key', value: 'K' },
			]),
		).toBe('按 ⌘+K')
		expect(
			getShortcutAccessibilityLabel([
				{ type: 'key', value: 'G' },
				{ type: 'separator', value: '→' },
				{ type: 'key', value: 'T' },
			]),
		).toBe('依次按 G、T')
	})
})
