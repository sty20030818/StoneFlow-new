import type { CommandId } from '@/features/command/core'

export type KeybindingScope = 'global' | 'command-menu' | 'list' | 'row' | 'dropdown'

export type ShortcutPlatform = 'mac' | 'windows' | 'linux'

/** `hidden` 仅表示绑定可执行但不进入界面展示，不代表命令尚未实现。 */
export type KeybindingDisplay = 'primary' | 'alternative' | 'hidden'

export type KeybindingKey =
	| string
	| 'ArrowUp'
	| 'ArrowDown'
	| 'ArrowLeft'
	| 'ArrowRight'
	| 'Enter'
	| 'Escape'
	| 'Delete'
	| 'Backspace'
	| 'Space'

export type KeybindingStroke = {
	key: KeybindingKey
	/** 当前平台的主修饰键：macOS 为 Command，Windows / Linux 为 Control。 */
	mod?: boolean
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
	/** 明确快捷键的展示职责，禁止再用数组声明顺序推断主快捷键。 */
	display: KeybindingDisplay
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
	commandIds: readonly CommandId[]
	platforms: readonly ShortcutPlatform[]
}
