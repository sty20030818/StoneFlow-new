import { useMemo } from 'react'

import { useBulkActionContext } from '@/features/bulk-action'
import {
	CommandRegistry,
	CommandRuntime,
	COMMAND_IDS,
	matchKeybindingEvent,
	SHORTCUT_DISPATCH_PRIORITY,
	useShortcutDispatcher,
	useShortcutRegistry,
	type CommandRowTargetContext,
	type CommandId,
	type NormalizedKeyEvent,
} from '@/features/command'
import type { TaskListItem } from '@/shared/types'

import {
	createTaskRowCommandActions,
	createTaskRowCommandContext,
	createTaskRowCommands,
} from './rowCommandRuntime'

type UseTaskRowCommandShortcutsOptions = {
	tasks: TaskListItem[]
	activeTaskId: string | null
	focusedTaskId: string | null
	selectedTaskIds: ReadonlySet<string>
	ownsEventTarget: (target: EventTarget | null) => boolean
	onToggleTaskSelection: (taskId: string) => void
	onClearTaskSelection: () => void
	onOpenTask: (taskId: string) => void
	onPeekTask?: (taskId: string, source: 'keyboard' | 'pointer') => void
}

const TASK_DOMAIN_ROW_COMMAND_IDS = new Set<CommandId>([
	COMMAND_IDS.taskComplete,
	COMMAND_IDS.taskArchive,
	COMMAND_IDS.taskDelete,
	COMMAND_IDS.taskSetPriority,
	COMMAND_IDS.taskSetStatus,
	COMMAND_IDS.taskOpenDateMenu,
	COMMAND_IDS.taskChangePlacement,
])

/** 只绑定任务领域命令；集合导航、选择与真实焦点由 collection owner 负责。 */
export function useTaskRowCommandShortcuts({
	tasks,
	activeTaskId,
	focusedTaskId,
	selectedTaskIds,
	ownsEventTarget,
	onToggleTaskSelection,
	onClearTaskSelection,
	onOpenTask,
	onPeekTask,
}: UseTaskRowCommandShortcutsOptions) {
	const shortcutRegistry = useShortcutRegistry()
	const rowBindings = useMemo(
		() =>
			shortcutRegistry
				.getByScope('row')
				.filter((binding) => TASK_DOMAIN_ROW_COMMAND_IDS.has(binding.commandId)),
		[shortcutRegistry],
	)
	const { runBulkAction } = useBulkActionContext()
	const selectedTasks = useMemo(
		() => tasks.filter((task) => selectedTaskIds.has(task.id)),
		[selectedTaskIds, tasks],
	)
	const selectedIds = useMemo(() => selectedTasks.map((task) => task.id), [selectedTasks])
	const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
	const rowTarget = useMemo(
		() => resolveRowTarget(selectedIds, focusedTaskId, activeTaskId, taskById),
		[activeTaskId, focusedTaskId, selectedIds, taskById],
	)
	const targetTask = rowTarget.targetId ? taskById.get(rowTarget.targetId) : undefined
	const runtime = useMemo(() => {
		const actions = createTaskRowCommandActions({
			rowTarget,
			targetTask,
			selectedTasks,
			runBulkAction,
			onClearTaskSelection,
			onOpenTask,
			onPeekTask,
			onToggleTaskSelection,
		})

		return new CommandRuntime({
			registry: new CommandRegistry(createTaskRowCommands(actions)),
			getContext: () => createTaskRowCommandContext(rowTarget, selectedIds, focusedTaskId),
		})
	}, [
		focusedTaskId,
		onClearTaskSelection,
		onOpenTask,
		onPeekTask,
		onToggleTaskSelection,
		rowTarget,
		runBulkAction,
		selectedIds,
		selectedTasks,
		targetTask,
	])

	useShortcutDispatcher(SHORTCUT_DISPATCH_PRIORITY.row, (event) => {
		if (!ownsEventTarget(event.target) || (!rowTarget.hasTarget && selectedIds.length === 0)) {
			return 'unhandled'
		}

		const result = matchKeybindingEvent({
			bindings: rowBindings,
			event: normalizeKeyboardEvent(event),
			scope: 'row',
			chordState: null,
			now: performance.now(),
		})
		if (result.status !== 'matched') return 'unhandled'

		if (result.keybinding.preventDefault) event.preventDefault()
		void runtime.execute(result.keybinding.commandId)
		return 'handled'
	})
}

function resolveRowTarget(
	selectedIds: readonly string[],
	focusedTaskId: string | null,
	activeTaskId: string | null,
	taskById: ReadonlyMap<string, TaskListItem>,
): CommandRowTargetContext {
	const selectionTarget = selectedIds.length === 1 ? selectedIds[0] : null
	const targetId = [selectionTarget, focusedTaskId, activeTaskId].find(
		(candidate): candidate is string => Boolean(candidate && taskById.has(candidate)),
	)
	if (!targetId) {
		return {
			source: 'none',
			hasTarget: false,
			isTaskTarget: false,
			isProjectTarget: false,
		}
	}

	return {
		targetId,
		targetType: 'task',
		source:
			targetId === selectionTarget ? 'selection' : targetId === focusedTaskId ? 'focus' : 'drawer',
		hasTarget: true,
		isTaskTarget: true,
		isProjectTarget: false,
	}
}

function normalizeKeyboardEvent(event: KeyboardEvent): NormalizedKeyEvent {
	return {
		key: event.key,
		metaKey: event.metaKey,
		ctrlKey: event.ctrlKey,
		altKey: event.altKey,
		shiftKey: event.shiftKey,
		defaultPrevented: event.defaultPrevented,
		isComposing: event.isComposing,
		target: event.target,
	}
}
