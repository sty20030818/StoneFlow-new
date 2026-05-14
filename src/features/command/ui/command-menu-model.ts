import { COMMAND_IDS, type Command, type CommandContext, type CommandId, type CommandRuntime } from '@/features/command/core'
import { DEFAULT_KEYBINDINGS, formatKeybindingSequence, KeybindingRegistry } from '@/features/command/keybinding'

export type CommandMenuGroupKey =
	| 'open'
	| 'new'
	| 'task'
	| 'move'
	| 'project'
	| 'view'
	| 'filter'
	| 'inbox'
	| 'layout'
	| 'navigation'
	| 'general'
	| 'system'

export type CommandMenuEntry = {
	command: Command
	disabled: boolean
	disabledReason?: string
	shortcut: string | null
}

export type CommandMenuGroup = {
	key: CommandMenuGroupKey
	heading: string
	entries: CommandMenuEntry[]
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

const DEFAULT_HIDDEN_COMMAND_IDS: ReadonlySet<CommandId> = new Set([COMMAND_IDS.openCommandMenu])
const keybindingRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

export function buildCommandMenuGroups(runtime: CommandRuntime, context: CommandContext) {
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

	return GROUPS.map<CommandMenuGroup>(({ key, heading }) => ({
		key,
		heading,
		entries: entries
			.filter(({ command }) => command.category === key)
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
	return binding ? formatKeybindingSequence(binding.sequence) : null
}
