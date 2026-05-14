import { COMMAND_IDS } from '@/features/command/core'
import { getCommandShortcutDisplay } from './shortcut-display'

describe('getCommandShortcutDisplay', () => {
	it('返回默认命令快捷键显示文案', () => {
		expect(getCommandShortcutDisplay(COMMAND_IDS.newQuickTask)).toBe('C')
		expect(getCommandShortcutDisplay(COMMAND_IDS.newFullTask)).toBe('N T')
	})

	it('未绑定命令返回 null', () => {
		expect(getCommandShortcutDisplay('test.unbound')).toBeNull()
	})
})
