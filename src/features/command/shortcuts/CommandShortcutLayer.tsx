import type { CommandId } from '@/features/command/core'
import { DEFAULT_KEYBINDINGS } from '@/features/command/keybinding'
import { useCommandShortcuts } from './use-command-shortcuts'

type CommandShortcutLayerProps = {
	onTrigger: (id: CommandId) => void
}

export function CommandShortcutLayer({ onTrigger }: CommandShortcutLayerProps) {
	useCommandShortcuts({
		bindings: DEFAULT_KEYBINDINGS,
		onTrigger,
	})

	return null
}
