import { DEFAULT_KEYBINDINGS, tokenizeKeybindingSequence } from '@/features/command/keybinding'
import { COMMAND_IDS } from '@/features/command/core'
import { getCommandShortcutDisplay, getCommandShortcutTokens } from './shortcut-display'

describe('getCommandShortcutDisplay', () => {
	it('返回默认命令快捷键显示文案', () => {
		expect(getCommandShortcutDisplay(COMMAND_IDS.newQuickTask)).toBe('C')
		expect(getCommandShortcutDisplay(COMMAND_IDS.newFullTask)).toBe('N T')
	})

	it('未绑定命令返回 null', () => {
		expect(getCommandShortcutDisplay('test.unbound')).toBeNull()
	})
})

describe('getCommandShortcutTokens', () => {
	it('返回拆键后的快捷键 token', () => {
		expect(getCommandShortcutTokens(COMMAND_IDS.openCommandMenu)).toEqual(
			tokenizeKeybindingSequence(
				DEFAULT_KEYBINDINGS.find((binding) => binding.commandId === COMMAND_IDS.openCommandMenu)!
					.sequence,
			),
		)
		expect(getCommandShortcutTokens(COMMAND_IDS.goStandalone)).toEqual(
			tokenizeKeybindingSequence(
				DEFAULT_KEYBINDINGS.find((binding) => binding.commandId === COMMAND_IDS.goStandalone)!.sequence,
			),
		)
	})

	it('未绑定命令返回 null', () => {
		expect(getCommandShortcutTokens('test.unbound')).toBeNull()
	})
})
