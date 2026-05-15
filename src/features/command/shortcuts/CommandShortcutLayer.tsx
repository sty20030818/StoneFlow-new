import type { CommandId } from '@/features/command/core'
import { DEFAULT_KEYBINDINGS, type Keybinding } from '@/features/command/keybinding'
import type { CommandChordSession } from './chord-session'
import { useCommandShortcuts } from './use-command-shortcuts'

type CommandShortcutLayerProps = {
	bindings?: Keybinding[]
	onTrigger: (id: CommandId) => void
	onChordStateChange?: (session: CommandChordSession | null) => void
}

export function CommandShortcutLayer({
	bindings = DEFAULT_KEYBINDINGS,
	onTrigger,
	onChordStateChange,
}: CommandShortcutLayerProps) {
	useCommandShortcuts({
		bindings,
		onTrigger,
		onChordStateChange,
	})

	return null
}
