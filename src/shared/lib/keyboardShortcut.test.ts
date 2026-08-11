import {
	getShortcutAccessibilityLabel,
	tokenizeShortcutSequence,
	tokenizeShortcutStroke,
} from './keyboardShortcut'

function values(tokens: ReturnType<typeof tokenizeShortcutStroke>) {
	return tokens.map((token) => token.value)
}

describe('keyboardShortcut', () => {
	it('按平台原生顺序展示修饰键，并合并同一物理修饰键', () => {
		expect(
			values(
				tokenizeShortcutStroke(
					{ key: 'Enter', alt: true, ctrl: true, mod: true, shift: true },
					'mac',
				),
			),
		).toEqual(['⌃', '⌥', '⇧', '⌘', 'Enter'])
		expect(
			values(
				tokenizeShortcutStroke(
					{ key: 'Enter', alt: true, ctrl: true, meta: true, shift: true },
					'windows',
				),
			),
		).toEqual(['Win', 'Ctrl', 'Alt', 'Shift', 'Enter'])
		expect(
			values(tokenizeShortcutStroke({ key: 'Enter', ctrl: true, mod: true }, 'windows')),
		).toEqual(['Ctrl', 'Enter'])
	})

	it.each([
		['Enter', 'Enter', 'Enter'],
		['Escape', 'Esc', 'Esc'],
		['Space', 'Space', 'Space'],
		['Backspace', '⌫', 'Backspace'],
		['Delete', '⌦', 'Delete'],
		['ArrowUp', '↑', '↑'],
		['ArrowDown', '↓', '↓'],
		['ArrowLeft', '←', '←'],
		['ArrowRight', '→', '→'],
	] as const)('%s 使用平台化键帽', (key, macLabel, windowsLabel) => {
		expect(values(tokenizeShortcutStroke({ key }, 'mac'))).toEqual([macLabel])
		expect(values(tokenizeShortcutStroke({ key }, 'windows'))).toEqual([windowsLabel])
	})

	it('视觉符号与读屏语义解耦，并区分组合键和 chord', () => {
		const combination = tokenizeShortcutStroke({ key: 'Enter', mod: true, shift: true }, 'mac')
		expect(getShortcutAccessibilityLabel(combination)).toBe('按 Shift + Command + Enter')

		const chord = tokenizeShortcutSequence([{ key: 'g' }, { key: 't' }], 'mac')
		expect(getShortcutAccessibilityLabel(chord)).toBe('依次按 G、T')
	})
})
