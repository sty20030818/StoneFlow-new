import type { KeybindingSequence, KeybindingStroke } from './keybinding.types'

type FormatKeybindingOptions = {
	platform?: 'mac' | 'windows' | 'linux'
}

export type ShortcutToken = {
	type: 'key' | 'separator'
	value: string
}

export function formatKeybindingSequence(
	sequence: KeybindingSequence,
	options: FormatKeybindingOptions = {},
) {
	return sequence.map((stroke) => formatKeybindingStroke(stroke, options)).join(' ')
}

/**
 * 将快捷键序列拆成稳定的键帽 token，供 Command / ShortcutHelp / ChordHint 统一渲染。
 * - 普通组合键拆成连续 key token：⌘K -> [⌘] [K]
 * - chord 在两段之间插入 separator：G I -> [G] → [I]
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
	{ platform = inferPlatform() }: FormatKeybindingOptions = {},
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
	{ platform = inferPlatform() }: FormatKeybindingOptions = {},
): ShortcutToken[] {
	const parts = [...getModifierParts(stroke, platform), formatKey(stroke.key, platform)]
	return parts.map((value) => ({ type: 'key', value }))
}

function getModifierParts(stroke: KeybindingStroke, platform: 'mac' | 'windows' | 'linux') {
	const modifierParts: string[] = []
	if (stroke.meta) {
		modifierParts.push(platform === 'mac' ? '⌘' : 'Ctrl')
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

function formatKey(key: string, platform: 'mac' | 'windows' | 'linux') {
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

function inferPlatform(): 'mac' | 'windows' | 'linux' {
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
