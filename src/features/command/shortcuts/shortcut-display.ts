import type { CommandId } from '@/features/command/core'
import {
	type KeybindingRegistry,
	type KeybindingScope,
	type ShortcutPlatform,
} from '@/features/command/keybinding'
import {
	inferShortcutPlatform,
	tokenizeShortcutSequence,
	type ShortcutToken,
} from '@/shared/lib/keyboardShortcut'

type ShortcutResolutionBase = {
	registry: KeybindingRegistry
	commandId: CommandId
	scope: KeybindingScope
	platform?: ShortcutPlatform
}

type PrimaryShortcutResolution = ShortcutResolutionBase & {
	mode: 'primary'
}

type AllShortcutResolution = ShortcutResolutionBase & {
	mode: 'all'
}

export function resolveCommandShortcut(options: PrimaryShortcutResolution): ShortcutToken[] | null
export function resolveCommandShortcut(options: AllShortcutResolution): ShortcutToken[][]
export function resolveCommandShortcut(
	options: PrimaryShortcutResolution | AllShortcutResolution,
): ShortcutToken[] | ShortcutToken[][] | null {
	const platform = options.platform ?? inferShortcutPlatform()
	const query = { commandId: options.commandId, scope: options.scope }

	if (options.mode === 'primary') {
		const binding = options.registry.resolvePrimary(query)
		return binding ? tokenizeShortcutSequence(binding.sequence, platform) : null
	}

	return options.registry
		.resolveAll(query)
		.map((binding) => tokenizeShortcutSequence(binding.sequence, platform))
}
