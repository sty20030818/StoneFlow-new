import type { CommandId } from '@/features/command/core'
import {
	inferShortcutPlatform,
	tokenizeKeybindingSequence,
	type KeybindingRegistry,
	type KeybindingScope,
	type ShortcutPlatform,
	type ShortcutToken,
} from '@/features/command/keybinding'

type ShortcutResolutionBase = {
	registry: KeybindingRegistry
	commandId: CommandId
	scope: KeybindingScope
	platform?: ShortcutPlatform
}

type PrimaryShortcutResolution = ShortcutResolutionBase & {
	mode: 'primary'
}

type AllShortcutResolution = ShortcutResolutionBase & {
	mode: 'all'
}

export function resolveCommandShortcut(options: PrimaryShortcutResolution): ShortcutToken[] | null
export function resolveCommandShortcut(options: AllShortcutResolution): ShortcutToken[][]
export function resolveCommandShortcut(
	options: PrimaryShortcutResolution | AllShortcutResolution,
): ShortcutToken[] | ShortcutToken[][] | null {
	const platform = options.platform ?? inferShortcutPlatform()
	const query = { commandId: options.commandId, scope: options.scope }

	if (options.mode === 'primary') {
		const binding = options.registry.resolvePrimary(query)
		return binding ? tokenizeKeybindingSequence(binding.sequence, { platform }) : null
	}

	return options.registry
		.resolveAll(query)
		.map((binding) => tokenizeKeybindingSequence(binding.sequence, { platform }))
}

/** 将视觉键帽 token 转成读屏文案；separator 始终表达为顺序输入。 */
export function getShortcutAccessibilityLabel(tokens: readonly ShortcutToken[]) {
	const strokes: string[][] = [[]]
	for (const token of tokens) {
		if (token.type === 'separator') {
			strokes.push([])
			continue
		}
		strokes.at(-1)?.push(token.value)
	}

	const strokeLabels = strokes
		.filter((stroke) => stroke.length > 0)
		.map((stroke) => stroke.join('+'))
	if (strokeLabels.length === 0) {
		return ''
	}
	return strokeLabels.length === 1 ? `按 ${strokeLabels[0]}` : `依次按 ${strokeLabels.join('、')}`
}
