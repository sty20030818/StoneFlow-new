import {
	COMMAND_IDS,
	type CommandContext,
	type CommandId,
	type CommandProjection,
	type CommandRuntime,
} from '@/features/command/core'
import { type KeybindingRegistry } from '@/features/command/keybinding'
import { resolveCommandShortcut } from '@/features/command/shortcuts/shortcut-display'
import type { ShortcutToken } from '@/shared/lib/keyboardShortcut'

export type CommandMenuGroupKey = 'bulk' | 'create' | 'navigate' | 'action' | 'project' | 'task'

export type CommandMenuEntry = CommandProjection & {
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
	categories: CommandProjection['category'][]
}> = [
	{ key: 'create', heading: '创建', categories: ['new'] },
	{ key: 'navigate', heading: '导航', categories: ['navigation', 'open'] },
	{
		key: 'action',
		heading: '操作',
		categories: ['general', 'layout', 'filter', 'view', 'system', 'move'],
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
export function buildCommandMenuGroups(
	runtime: CommandRuntime,
	context: CommandContext,
	shortcutRegistry: KeybindingRegistry,
): CommandMenuGroup[] {
	const visibleEntries: CommandProjection[] = []
	for (const projection of runtime.projectAll(context)) {
		if (projection.visible && !DEFAULT_HIDDEN_COMMAND_IDS.has(projection.id)) {
			visibleEntries.push(projection)
		}
	}
	const entries = visibleEntries.sort((left, right) => right.priority - left.priority)

	const defaultGroups = GROUPS.map<CommandMenuGroup>(({ key, heading, categories }) => {
		const groupEntries: CommandMenuEntry[] = []
		for (const projection of entries) {
			if (!categories.includes(projection.category)) {
				continue
			}
			if (shouldHideDefaultTaskCommand(projection.id, context)) {
				continue
			}
			groupEntries.push({
				...projection,
				shortcut: getCommandMenuShortcut(projection.id, shortcutRegistry),
			})
		}
		return { key, heading, entries: groupEntries }
	}).filter((group) => group.entries.length > 0)

	const bulkGroup = buildBulkCommandMenuGroup(entries, context, shortcutRegistry)
	return bulkGroup ? [bulkGroup, ...defaultGroups] : defaultGroups
}

export function getCommandMenuShortcut(commandId: CommandId, shortcutRegistry: KeybindingRegistry) {
	return resolveCommandShortcut({
		registry: shortcutRegistry,
		commandId,
		scope: 'global',
		mode: 'primary',
	})
}

function buildBulkCommandMenuGroup(
	entries: CommandProjection[],
	context: CommandContext,
	shortcutRegistry: KeybindingRegistry,
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

	const bulkEntries: CommandMenuEntry[] = []
	for (const projection of entries) {
		if (!bulkCommandIds.has(projection.id)) {
			continue
		}
		bulkEntries.push({
			...projection,
			shortcut: getCommandMenuShortcut(projection.id, shortcutRegistry),
		})
	}

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
