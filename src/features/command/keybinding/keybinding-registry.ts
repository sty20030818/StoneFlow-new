import type { CommandId } from '@/features/command/core'

import { formatKeybindingSequence } from './keybinding-format'
import type {
	Keybinding,
	KeybindingConflict,
	KeybindingScope,
	KeybindingSequence,
} from './keybinding.types'

export class KeybindingRegistry {
	private readonly bindings: Keybinding[]

	constructor(bindings: Keybinding[] = []) {
		this.bindings = [...bindings]
	}

	getAll() {
		return [...this.bindings]
	}

	getByCommandId(commandId: CommandId) {
		return this.bindings.filter((binding) => binding.commandId === commandId)
	}

	getByScope(scope: KeybindingScope) {
		return this.bindings.filter((binding) => binding.scope === scope)
	}

	detectConflicts(): KeybindingConflict[] {
		const groups = new Map<
			string,
			{ scope: KeybindingScope; sequence: KeybindingSequence; commandIds: CommandId[] }
		>()

		for (const binding of this.bindings) {
			const key = getConflictKey(binding)
			const existing = groups.get(key)
			if (existing) {
				existing.commandIds.push(binding.commandId)
				continue
			}

			groups.set(key, {
				scope: binding.scope,
				sequence: binding.sequence,
				commandIds: [binding.commandId],
			})
		}

		return Array.from(groups.values()).filter((group) => group.commandIds.length > 1)
	}
}

function getConflictKey(binding: Keybinding) {
	return `${binding.scope}:${formatKeybindingSequence(binding.sequence, { platform: 'mac' })}`
}
