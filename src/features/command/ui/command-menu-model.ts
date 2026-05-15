import { COMMAND_IDS, type Command, type CommandContext, type CommandId, type CommandRuntime } from '@/features/command/core'
import { DEFAULT_KEYBINDINGS, KeybindingRegistry, tokenizeKeybindingSequence, type ShortcutToken } from '@/features/command/keybinding'

export type CommandMenuGroupKey =
	| 'create'
	| 'navigate'
	| 'action'
	| 'project'
	| 'task'

export type CommandMenuEntry = {
	command: Command
	disabled: boolean
	disabledReason?: string
	shortcut: ShortcutToken[] | null
}

export type CommandMenuGroup = {
	key: CommandMenuGroupKey
	heading: string
	entries: CommandMenuEntry[]
}

const GROUPS: Array<{
	key: CommandMenuGroupKey
	heading: string
	categories: Command['category'][]
}> = [
	{ key: 'create', heading: '创建', categories: ['new'] },
	{ key: 'navigate', heading: '导航', categories: ['navigation', 'open'] },
	{ key: 'action', heading: '操作', categories: ['general', 'layout', 'filter', 'inbox', 'view', 'system', 'move'] },
	{ key: 'project', heading: '项目', categories: ['project'] },
	{ key: 'task', heading: '任务', categories: ['task'] },
]

const DEFAULT_HIDDEN_COMMAND_IDS: ReadonlySet<CommandId> = new Set([COMMAND_IDS.openCommandMenu])
const keybindingRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

export function buildCommandMenuGroups(runtime: CommandRuntime, context: CommandContext): CommandMenuGroup[] {
	const entries = runtime
		.getCommands()
		.map((command) => {
			const state = runtime.getCommandState(command, context)
			return {
				command,
				state,
			}
		})
		.filter(({ command, state }) => state.visible && !DEFAULT_HIDDEN_COMMAND_IDS.has(command.id))
		.sort((left, right) => right.state.priority - left.state.priority)

	return GROUPS.map<CommandMenuGroup>(({ key, heading, categories }) => ({
		key,
		heading,
		entries: entries
			.filter(({ command }) => categories.includes(command.category))
			.map(({ command, state }) => ({
				command,
				disabled: !state.enabled,
				disabledReason: state.disabledReason,
				shortcut: getCommandMenuShortcut(command.id),
			})),
	})).filter((group) => group.entries.length > 0)
}

export function getCommandMenuShortcut(commandId: Command['id']) {
	const binding = keybindingRegistry.getByCommandId(commandId)[0]
	return binding ? tokenizeKeybindingSequence(binding.sequence) : null
}
