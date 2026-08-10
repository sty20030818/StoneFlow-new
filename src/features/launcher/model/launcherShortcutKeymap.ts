export type LauncherShortcutId =
	| 'selectPrevious'
	| 'selectNext'
	| 'confirm'
	| 'createAndContinue'
	| 'createAndOpen'
	| 'clearOrClose'

export type LauncherShortcutPlatform = 'mac' | 'windows' | 'linux'

type LauncherShortcutEvent = {
	key: string
	metaKey: boolean
	ctrlKey: boolean
	shiftKey: boolean
}

type LauncherShortcutBinding = {
	id: LauncherShortcutId
	key: 'ArrowUp' | 'ArrowDown' | 'Enter' | 'Escape'
	mod?: true
	shift?: true
}

type MatchLauncherShortcutOptions = {
	platform?: LauncherShortcutPlatform
	isEnabled?: (id: LauncherShortcutId) => boolean
}

/**
 * Launcher 独立窗口的本地快捷键真源。
 * 声明顺序同时表达匹配优先级：组合键必须先于同键位的普通动作。
 */
const LAUNCHER_SHORTCUT_BINDINGS = {
	clearOrClose: { id: 'clearOrClose', key: 'Escape' },
	selectNext: { id: 'selectNext', key: 'ArrowDown' },
	selectPrevious: { id: 'selectPrevious', key: 'ArrowUp' },
	createAndOpen: { id: 'createAndOpen', key: 'Enter', mod: true },
	createAndContinue: { id: 'createAndContinue', key: 'Enter', shift: true },
	confirm: { id: 'confirm', key: 'Enter' },
} as const satisfies Record<LauncherShortcutId, LauncherShortcutBinding>

export function matchLauncherShortcut(
	event: LauncherShortcutEvent,
	{
		platform = inferLauncherShortcutPlatform(),
		isEnabled = () => true,
	}: MatchLauncherShortcutOptions = {},
): LauncherShortcutId | null {
	for (const binding of Object.values(LAUNCHER_SHORTCUT_BINDINGS)) {
		if (!isEnabled(binding.id) || !matchesBinding(event, binding, platform)) {
			continue
		}

		return binding.id
	}

	return null
}

export function formatLauncherShortcut(
	id: LauncherShortcutId,
	platform: LauncherShortcutPlatform = inferLauncherShortcutPlatform(),
) {
	const binding: LauncherShortcutBinding = LAUNCHER_SHORTCUT_BINDINGS[id]
	const mod = binding.mod ? (platform === 'mac' ? '⌘' : 'Ctrl+') : ''
	const shift = binding.shift ? '⇧' : ''
	return `${mod}${shift}${formatKey(binding.key)}`
}

export function inferLauncherShortcutPlatform(): LauncherShortcutPlatform {
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

function matchesBinding(
	event: LauncherShortcutEvent,
	binding: LauncherShortcutBinding,
	platform: LauncherShortcutPlatform,
) {
	if (event.key !== binding.key) {
		return false
	}

	if (binding.mod && (platform === 'mac' ? !event.metaKey : !event.ctrlKey)) {
		return false
	}

	return !binding.shift || event.shiftKey
}

function formatKey(key: LauncherShortcutBinding['key']) {
	switch (key) {
		case 'ArrowUp':
			return '↑'
		case 'ArrowDown':
			return '↓'
		case 'Enter':
			return '↵'
		case 'Escape':
			return 'Esc'
	}
}
