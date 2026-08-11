import {
	areStrokesEqual,
	type Keybinding,
	type KeybindingChordState,
	type ShortcutPlatform,
} from '@/features/command/keybinding'
import {
	inferShortcutPlatform,
	tokenizeShortcutStroke,
	type ShortcutToken,
} from '@/shared/lib/keyboardShortcut'

type ChordHintOption = {
	commandId: string
	tokens: ShortcutToken[]
}

export type CommandChordSession = {
	prefixTokens: ShortcutToken[]
	options: ChordHintOption[]
}

/**
 * 基于真实 keybinding 反推出当前前缀能接受的第二键候选。
 * 这里不存业务枚举，避免帮助提示和真实绑定漂移。
 */
export function buildChordSession(
	bindings: readonly Keybinding[],
	chordState: KeybindingChordState,
	platform: ShortcutPlatform = inferShortcutPlatform(),
): CommandChordSession {
	// 合并 filter + map + filter 为单次遍历
	const options: ChordHintOption[] = []
	for (const binding of bindings) {
		if (
			binding.scope !== chordState.scope ||
			binding.display === 'hidden' ||
			binding.sequence.length !== 2 ||
			!areStrokesEqual(binding.sequence[0], chordState.prefix, platform)
		) {
			continue
		}

		const stroke = binding.sequence[1]
		if (!stroke) {
			continue
		}

		options.push({
			commandId: binding.commandId,
			tokens: tokenizeShortcutStroke(stroke, platform),
		})
	}

	return {
		prefixTokens: tokenizeShortcutStroke(chordState.prefix, platform),
		options,
	}
}
