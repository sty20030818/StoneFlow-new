import {
	areStrokesEqual,
	formatKeybindingStroke,
	tokenizeKeybindingStroke,
	type ShortcutToken,
	type Keybinding,
	type KeybindingChordState,
	type KeybindingScope,
	type KeybindingStroke,
} from '@/features/command/keybinding'

export type ChordHintOption = {
	commandId: string
	stroke: KeybindingStroke
	display: string
	tokens: ShortcutToken[]
}

export type CommandChordSession = {
	prefix: KeybindingStroke
	scope: KeybindingScope
	prefixDisplay: string
	prefixTokens: ShortcutToken[]
	options: ChordHintOption[]
}

/**
 * 基于真实 keybinding 反推出当前前缀能接受的第二键候选。
 * 这里不存业务枚举，避免帮助提示和真实绑定漂移。
 */
export function buildChordSession(
	bindings: Keybinding[],
	chordState: KeybindingChordState,
): CommandChordSession {
	const options = bindings
		.filter(
			(binding) =>
				binding.scope === chordState.scope &&
				binding.sequence.length === 2 &&
				areStrokesEqual(binding.sequence[0], chordState.prefix),
		)
		.map((binding) => {
			const stroke = binding.sequence[1]
			if (!stroke) {
				return null
			}

			return {
				commandId: binding.commandId,
				stroke,
				display: formatKeybindingStroke(stroke),
				tokens: tokenizeKeybindingStroke(stroke),
			}
		})
		.filter((option): option is ChordHintOption => option !== null)

	return {
		prefix: chordState.prefix,
		scope: chordState.scope,
		prefixDisplay: formatKeybindingStroke(chordState.prefix),
		prefixTokens: tokenizeKeybindingStroke(chordState.prefix),
		options,
	}
}
