import { APP_SHORTCUT_BINDINGS } from '@/app/shortcuts/shortcutRegistry'
import type { CommandId } from '@/features/command/core'
import { formatKeybindingSequence } from '@/features/command/keybinding'

export function getShortcutDisplay(id: CommandId) {
	const binding = APP_SHORTCUT_BINDINGS.find((item) => item.commandId === id)
	return binding ? formatKeybindingSequence(binding.sequence) : null
}
