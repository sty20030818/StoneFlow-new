import { DEFAULT_KEYBINDINGS, formatKeybindingSequence, KeybindingRegistry } from '@/features/command/keybinding'
import type { CommandContext, CommandRuntime } from '@/features/command/core'

import type { CommandMenuGroupKey } from './command-menu-model'

export type ShortcutHelpEntry = {
	id: string
	title: string
	description?: string
	shortcut: string | null
	isCommandOnly: boolean
}

export type ShortcutHelpGroup = {
	key: CommandMenuGroupKey
	heading: string
	entries: ShortcutHelpEntry[]
}

const GROUPS: Array<{ key: CommandMenuGroupKey; heading: string }> = [
	{ key: 'open', heading: '打开' },
	{ key: 'new', heading: '新建' },
	{ key: 'task', heading: '任务' },
	{ key: 'move', heading: '移动' },
	{ key: 'project', heading: '项目' },
	{ key: 'view', heading: '视图' },
	{ key: 'filter', heading: '筛选' },
	{ key: 'inbox', heading: '收件箱' },
	{ key: 'layout', heading: '布局' },
	{ key: 'navigation', heading: '导航' },
	{ key: 'general', heading: '通用' },
	{ key: 'system', heading: '系统' },
]

const keybindingRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

export function buildShortcutHelpGroups(runtime: CommandRuntime, context: CommandContext): ShortcutHelpGroup[] {
	const entries = runtime
		.getCommands()
		.map((command) => ({
			command,
			state: runtime.getCommandState(command, context),
		}))
		.filter(({ state }) => state.visible)
		.sort((left, right) => right.state.priority - left.state.priority)

	return GROUPS.map<ShortcutHelpGroup>(({ key, heading }) => ({
		key,
		heading,
		entries: entries
			.filter(({ command }) => command.category === key)
			.map(({ command }) => ({
				id: command.id,
				title: command.title,
				description: command.description,
				shortcut: getShortcutHelpShortcut(command.id),
				isCommandOnly: keybindingRegistry.getByCommandId(command.id).length === 0,
			})),
	})).filter((group) => group.entries.length > 0)
}

export function getShortcutHelpShortcut(commandId: string) {
	const binding = keybindingRegistry.getByCommandId(commandId)[0]
	return binding ? formatKeybindingSequence(binding.sequence) : null
}
