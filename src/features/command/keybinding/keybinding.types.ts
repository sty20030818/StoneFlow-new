import type { CommandId } from '@/features/command/core'

export type KeybindingScope = 'global' | 'command-menu' | 'list' | 'row' | 'dropdown'

export type KeybindingKey =
	| string
	| 'ArrowUp'
	| 'ArrowDown'
	| 'ArrowLeft'
	| 'ArrowRight'
	| 'Enter'
	| 'Escape'
	| 'Delete'
	| 'Space'

export type KeybindingStroke = {
	key: KeybindingKey
	meta?: boolean
	ctrl?: boolean
	alt?: boolean
	shift?: boolean
}

export type KeybindingSequence =
	| readonly [KeybindingStroke]
	| readonly [KeybindingStroke, KeybindingStroke]

export type Keybinding = {
	commandId: CommandId
	sequence: KeybindingSequence
	scope: KeybindingScope
	preventDefault: boolean
	allowInEditable: boolean
}

export type NormalizedKeyEvent = {
	key: string
	metaKey: boolean
	ctrlKey: boolean
	altKey: boolean
	shiftKey: boolean
	defaultPrevented: boolean
	isComposing: boolean
	target: EventTarget | null
}

export type KeybindingChordState = {
	prefix: KeybindingStroke
	scope: KeybindingScope
	startedAt: number
}

export type KeybindingMatchResult =
	| { status: 'matched'; keybinding: Keybinding }
	| { status: 'pending'; prefix: KeybindingStroke; scope: KeybindingScope }
	| { status: 'cancelled' }
	| { status: 'ignored' }

export type KeybindingConflict = {
	scope: KeybindingScope
	sequence: KeybindingSequence
	commandIds: CommandId[]
}
