import type { CommandId } from '@/features/command/core'
import type { KeybindingScope, ShortcutPlatform } from '@/features/command/keybinding'
import type { CommandChordSession } from './chord-session'
import { useShortcutRegistry } from './shortcut-registry-context'
import { useCommandShortcuts } from './use-command-shortcuts'

type CommandShortcutLayerProps = {
	onTrigger: (id: CommandId) => void
	shouldTrigger?: (id: CommandId) => boolean
	onChordStateChange?: (session: CommandChordSession | null) => void
	scope?: KeybindingScope
	platform?: ShortcutPlatform
}

export function CommandShortcutLayer({
	onTrigger,
	shouldTrigger,
	onChordStateChange,
	scope = 'global',
	platform,
}: CommandShortcutLayerProps) {
	const registry = useShortcutRegistry()
	useCommandShortcuts({
		bindings: registry.getByScope(scope),
		onTrigger,
		shouldTrigger,
		onChordStateChange,
		scope,
		platform,
	})

	return null
}
