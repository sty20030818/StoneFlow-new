import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	tokenizeKeybindingSequence,
	type ShortcutToken,
} from '@/features/command/keybinding'
import type { Command, CommandContext, CommandRuntime } from '@/features/command/core'

import type { CommandMenuGroupKey } from './command-menu-model'

export type ShortcutHelpEntry = {
	id: string
	title: string
	description?: string
	shortcut: ShortcutToken[] | null
	isCommandOnly: boolean
}

export type ShortcutHelpGroup = {
	key: CommandMenuGroupKey
	heading: string
	entries: ShortcutHelpEntry[]
}

const GROUPS: Array<{ key: CommandMenuGroupKey; heading: string }> = [
	{ key: 'create', heading: '创建' },
	{ key: 'navigate', heading: '导航' },
	{ key: 'action', heading: '操作' },
	{ key: 'project', heading: '项目' },
	{ key: 'task', heading: '任务' },
]

const keybindingRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

export function buildShortcutHelpGroups(
	runtime: CommandRuntime,
	context: CommandContext,
): ShortcutHelpGroup[] {
	// 合并 map + filter 为单次遍历，排序仍需在完整数组上进行
	const visibleEntries: Array<{
		command: Command
		state: ReturnType<CommandRuntime['getCommandState']>
	}> = []
	for (const command of runtime.getCommands()) {
		const state = runtime.getCommandState(command, context)
		if (state.visible) {
			visibleEntries.push({ command, state })
		}
	}
	const entries = visibleEntries.sort((left, right) => right.state.priority - left.state.priority)

	return GROUPS.map<ShortcutHelpGroup>(({ key, heading }) => {
		// 合并 filter + map 为单次遍历
		const groupEntries: ShortcutHelpEntry[] = []
		for (const { command } of entries) {
			if (mapCommandCategoryToHelpGroup(command.category) !== key) {
				continue
			}
			groupEntries.push({
				id: command.id,
				title: command.title,
				description: command.description,
				shortcut: getShortcutHelpShortcut(command.id),
				isCommandOnly: keybindingRegistry.getByCommandId(command.id).length === 0,
			})
		}
		return { key, heading, entries: groupEntries }
	}).filter((group) => group.entries.length > 0)
}

export function getShortcutHelpShortcut(commandId: string) {
	const binding = keybindingRegistry.getByCommandId(commandId)[0]
	return binding ? tokenizeKeybindingSequence(binding.sequence) : null
}

function mapCommandCategoryToHelpGroup(category: string): CommandMenuGroupKey {
	if (category === 'new') {
		return 'create'
	}
	if (category === 'navigation' || category === 'open') {
		return 'navigate'
	}
	if (category === 'project') {
		return 'project'
	}
	if (category === 'task') {
		return 'task'
	}
	return 'action'
}
