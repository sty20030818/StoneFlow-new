import type { KeybindingSequence, KeybindingStroke, ShortcutPlatform } from './keybinding.types'

export type FormatKeybindingOptions = {
	platform?: ShortcutPlatform
}

export type ShortcutToken = {
	type: 'key' | 'separator'
	value: string
}

export function formatKeybindingSequence(
	sequence: KeybindingSequence,
	options: FormatKeybindingOptions = {},
) {
	return sequence.map((stroke) => formatKeybindingStroke(stroke, options)).join(' → ')
}

/**
 * 生成不依赖视觉箭头的读屏文案，明确 chord 是按顺序输入而非同时按下。
 */
export function formatKeybindingSequenceAccessible(
	sequence: KeybindingSequence,
	options: FormatKeybindingOptions = {},
) {
	const strokes = sequence.map((stroke) => formatKeybindingStroke(stroke, options))
	return strokes.length === 1 ? `按 ${strokes[0]}` : `依次按 ${strokes.join('、')}`
}

/**
 * 将快捷键序列拆成稳定的键帽 token，供 Command / ShortcutHelp / ChordHint 统一渲染。
 * - 普通组合键拆成连续 key token：⌘K -> [⌘] [K]
 * - chord 在两段之间插入 separator：G → I -> [G] → [I]
 */
export function tokenizeKeybindingSequence(
	sequence: KeybindingSequence,
	options: FormatKeybindingOptions = {},
): ShortcutToken[] {
	return sequence.flatMap<ShortcutToken>((stroke, index) => {
		const strokeTokens = tokenizeKeybindingStroke(stroke, options)
		if (index === 0) {
			return strokeTokens
		}

		return [{ type: 'separator', value: '→' }, ...strokeTokens]
	})
}

export function formatKeybindingStroke(
	stroke: KeybindingStroke,
	{ platform = inferShortcutPlatform() }: FormatKeybindingOptions = {},
) {
	const modifierParts = getModifierParts(stroke, platform)
	const key = formatKey(stroke.key, platform)
	if (platform === 'mac' && modifierParts.length > 0) {
		return `${modifierParts.join('')}${key}`
	}

	return [...modifierParts, key].join(' ')
}

export function tokenizeKeybindingStroke(
	stroke: KeybindingStroke,
	{ platform = inferShortcutPlatform() }: FormatKeybindingOptions = {},
): ShortcutToken[] {
	const parts = [...getModifierParts(stroke, platform), formatKey(stroke.key, platform)]
	return parts.map((value) => ({ type: 'key', value }))
}

function getModifierParts(stroke: KeybindingStroke, platform: ShortcutPlatform) {
	const modifierParts: string[] = []
	if (stroke.mod) {
		modifierParts.push(platform === 'mac' ? '⌘' : 'Ctrl')
	}
	if (stroke.meta) {
		modifierParts.push(platform === 'mac' ? '⌘' : platform === 'windows' ? 'Win' : 'Meta')
	}
	if (stroke.ctrl) {
		modifierParts.push(platform === 'mac' ? '⌃' : 'Ctrl')
	}
	if (stroke.alt) {
		modifierParts.push(platform === 'mac' ? '⌥' : 'Alt')
	}
	if (stroke.shift) {
		modifierParts.push(platform === 'mac' ? '⇧' : 'Shift')
	}
	return modifierParts
}

function formatKey(key: string, platform: ShortcutPlatform) {
	if (key === ' ') {
		return platform === 'mac' ? '␠' : 'Space'
	}

	if (key === 'Enter') {
		return platform === 'mac' ? '↵' : 'Enter'
	}

	if (key === 'Escape') {
		return 'Esc'
	}

	if (key === 'Backspace') {
		return platform === 'mac' ? '⌫' : 'Backspace'
	}

	if (key === 'Delete') {
		return platform === 'mac' ? '⌦' : 'Delete'
	}

	if (key.startsWith('Arrow')) {
		return key.replace('Arrow', '')
	}

	if (key.length === 1) {
		return key.toUpperCase()
	}

	return key
}

export function inferShortcutPlatform(): ShortcutPlatform {
	if (typeof navigator === 'undefined') {
		return 'mac'
	}

	if (/Mac|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
		return 'mac'
	}

	if (/Windows/i.test(navigator.userAgent)) {
		return 'windows'
	}

	return 'linux'
}
