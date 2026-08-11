import {
	inferShortcutPlatform,
	tokenizeShortcutStroke,
	type ShortcutPlatform,
} from '@/shared/lib/keyboardShortcut'

export type LauncherShortcutId =
	| 'selectPrevious'
	| 'selectNext'
	| 'confirm'
	| 'createAndContinue'
	| 'createAndOpen'
	| 'clearOrClose'

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
	platform?: ShortcutPlatform
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
	{ platform = inferShortcutPlatform(), isEnabled = () => true }: MatchLauncherShortcutOptions = {},
): LauncherShortcutId | null {
	for (const binding of Object.values(LAUNCHER_SHORTCUT_BINDINGS)) {
		if (!isEnabled(binding.id) || !matchesBinding(event, binding, platform)) {
			continue
		}

		return binding.id
	}

	return null
}

export function getLauncherShortcutTokens(
	id: LauncherShortcutId,
	platform: ShortcutPlatform = inferShortcutPlatform(),
) {
	return tokenizeShortcutStroke(LAUNCHER_SHORTCUT_BINDINGS[id], platform)
}

function matchesBinding(
	event: LauncherShortcutEvent,
	binding: LauncherShortcutBinding,
	platform: ShortcutPlatform,
) {
	if (event.key !== binding.key) {
		return false
	}

	if (binding.mod && (platform === 'mac' ? !event.metaKey : !event.ctrlKey)) {
		return false
	}

	return !binding.shift || event.shiftKey
}
