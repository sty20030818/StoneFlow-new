import type { KeybindingSequence, KeybindingStroke } from './keybinding.types'

type FormatKeybindingOptions = {
	platform?: 'mac' | 'windows' | 'linux'
}

export function formatKeybindingSequence(
	sequence: KeybindingSequence,
	options: FormatKeybindingOptions = {},
) {
	return sequence.map((stroke) => formatKeybindingStroke(stroke, options)).join(' ')
}

export function formatKeybindingStroke(
	stroke: KeybindingStroke,
	{ platform = inferPlatform() }: FormatKeybindingOptions = {},
) {
	const modifierParts: string[] = []
	if (stroke.meta) {
		modifierParts.push(platform === 'mac' ? '⌘' : 'Ctrl')
	}
	if (stroke.ctrl) {
		modifierParts.push('Ctrl')
	}
	if (stroke.alt) {
		modifierParts.push(platform === 'mac' ? '⌥' : 'Alt')
	}
	if (stroke.shift) {
		modifierParts.push(platform === 'mac' ? '⇧' : 'Shift')
	}

	const key = formatKey(stroke.key)
	if (platform === 'mac' && modifierParts.length > 0) {
		return `${modifierParts.join('')}${key}`
	}

	return [...modifierParts, key].join(' ')
}

function formatKey(key: string) {
	if (key === ' ') {
		return 'Space'
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
