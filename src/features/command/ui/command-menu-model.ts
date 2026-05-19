import {
	COMMAND_IDS,
	type Command,
	type CommandContext,
	type CommandId,
	type CommandRuntime,
} from '@/features/command/core'
import {
	DEFAULT_KEYBINDINGS,
	KeybindingRegistry,
	tokenizeKeybindingSequence,
	type ShortcutToken,
} from '@/features/command/keybinding'

export type CommandMenuGroupKey = 'bulk' | 'create' | 'navigate' | 'action' | 'project' | 'task'

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
	{
		key: 'action',
		heading: '操作',
		categories: ['general', 'layout', 'filter', 'inbox', 'view', 'system', 'move'],
	},
	{ key: 'project', heading: '项目', categories: ['project'] },
	{ key: 'task', heading: '任务', categories: ['task'] },
]

const DEFAULT_HIDDEN_COMMAND_IDS: ReadonlySet<CommandId> = new Set([
	COMMAND_IDS.openCommandMenu,
	COMMAND_IDS.selectionDeleteByRoute,
])
const BULK_TASK_COMMAND_IDS: ReadonlySet<CommandId> = new Set([
	COMMAND_IDS.taskComplete,
	COMMAND_IDS.taskSetPriority,
	COMMAND_IDS.taskSetStatus,
	COMMAND_IDS.taskOpenDateMenu,
	COMMAND_IDS.taskChangePlacement,
	COMMAND_IDS.taskArchive,
	COMMAND_IDS.taskDelete,
])
const BULK_LIFECYCLE_COMMAND_IDS: ReadonlySet<CommandId> = new Set([
	COMMAND_IDS.lifecycleRestore,
	COMMAND_IDS.lifecycleDelete,
	COMMAND_IDS.lifecycleDeletePermanently,
])
const BULK_PROJECT_COMMAND_IDS: ReadonlySet<CommandId> = new Set([
	COMMAND_IDS.projectArchive,
	COMMAND_IDS.projectDelete,
])
const keybindingRegistry = new KeybindingRegistry(DEFAULT_KEYBINDINGS)

export function buildCommandMenuGroups(
	runtime: CommandRuntime,
	context: CommandContext,
): CommandMenuGroup[] {
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

	const defaultGroups = GROUPS.map<CommandMenuGroup>(({ key, heading, categories }) => ({
		key,
		heading,
		entries: entries
			.filter(({ command }) => categories.includes(command.category))
			.filter(({ command }) => !shouldHideDefaultTaskCommand(command.id, context))
			.map(({ command, state }) => ({
				command,
				disabled: !state.enabled,
				disabledReason: state.disabledReason,
				shortcut: getCommandMenuShortcut(command.id),
			})),
	})).filter((group) => group.entries.length > 0)

	const bulkGroup = buildBulkCommandMenuGroup(entries, context)
	return bulkGroup ? [bulkGroup, ...defaultGroups] : defaultGroups
}

export function getCommandMenuShortcut(commandId: Command['id']) {
	const binding = keybindingRegistry.getByCommandId(commandId)[0]
	return binding ? tokenizeKeybindingSequence(binding.sequence) : null
}

function buildBulkCommandMenuGroup(
	entries: Array<{
		command: Command
		state: ReturnType<CommandRuntime['getCommandState']>
	}>,
	context: CommandContext,
): CommandMenuGroup | null {
	if (
		(context.selection.type !== 'task' &&
			context.selection.type !== 'lifecycle' &&
			context.selection.type !== 'project') ||
		!context.selection.hasSelection
	) {
		return null
	}
	const bulkCommandIds = getBulkCommandIds(context.selection.type)

	const bulkEntries = entries
		.filter(({ command }) => bulkCommandIds.has(command.id))
		.map(({ command, state }) => ({
			command,
			disabled: !state.enabled,
			disabledReason: state.disabledReason,
			shortcut: getCommandMenuShortcut(command.id),
		}))

	if (bulkEntries.length === 0) {
		return null
	}

	return {
		key: 'bulk',
		heading: '批量操作',
		entries: bulkEntries,
	}
}

function shouldHideDefaultTaskCommand(commandId: CommandId, context: CommandContext) {
	return (
		(context.selection.type === 'task' ||
			context.selection.type === 'lifecycle' ||
			context.selection.type === 'project') &&
		context.selection.hasSelection &&
		(BULK_TASK_COMMAND_IDS.has(commandId) ||
			BULK_LIFECYCLE_COMMAND_IDS.has(commandId) ||
			BULK_PROJECT_COMMAND_IDS.has(commandId))
	)
}

function getBulkCommandIds(selectionType: NonNullable<CommandContext['selection']['type']>) {
	switch (selectionType) {
		case 'lifecycle':
			return BULK_LIFECYCLE_COMMAND_IDS
		case 'project':
			return BULK_PROJECT_COMMAND_IDS
		default:
			return BULK_TASK_COMMAND_IDS
	}
}
