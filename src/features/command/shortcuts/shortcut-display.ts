import type { CommandId } from '@/features/command/core'
import {
	DEFAULT_KEYBINDINGS,
	formatKeybindingSequence,
	tokenizeKeybindingSequence,
	type ShortcutToken,
} from '@/features/command/keybinding'

export function getCommandShortcutDisplay(id: CommandId) {
	const binding = DEFAULT_KEYBINDINGS.find((item) => item.commandId === id)
	return binding ? formatKeybindingSequence(binding.sequence) : null
}

export function getCommandShortcutTokens(id: CommandId): ShortcutToken[] | null {
	const binding = DEFAULT_KEYBINDINGS.find((item) => item.commandId === id)
	return binding ? tokenizeKeybindingSequence(binding.sequence) : null
}
