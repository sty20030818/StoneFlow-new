import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import {
	COMMAND_IDS,
	CommandRegistry,
	CommandRuntime,
	createEmptyCommandContext,
	type Command,
	type CommandContext,
	type CommandId,
} from '@/features/command/core'
import {
	matchKeybindingEvent,
	type KeybindingChordState,
	type NormalizedKeyEvent,
} from '@/features/command/keybinding'
import type { TaskListItem } from '@/shared/types'

import { resolveTaskRowTarget, type TaskRowRef } from './rowTargetResolver'
import { TASK_ROW_SHORTCUT_BINDINGS } from './taskRowShortcutBindings'

type TaskRowShortcutScopeProps = {
	children: (state: TaskRowShortcutState) => ReactNode
	tasks: TaskListItem[]
	activeTaskId: string | null
	selectedTaskIdSet: Set<string>
	onToggleTaskSelection: (taskId: string) => void
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
}

export type TaskRowShortcutState = {
	onRowHover: (taskId: string | null) => void
	onRowFocus: (taskId: string | null) => void
}

type TaskRowCommandActions = {
	complete: () => void | Promise<void>
	select: () => void
	peek: () => void
	openDetail: () => void
	archive: () => void | Promise<void>
	deleteTask: () => void | Promise<void>
	openPriorityMenu: () => void
	openStatusMenu: () => void
	openDateMenu: () => void
}

const ROW_COMMAND_DISABLED_REASON = 'Row 上下文尚未接入'

export function TaskRowShortcutScope({
	children,
	tasks,
	activeTaskId,
	selectedTaskIdSet,
	onToggleTaskSelection,
	onToggleTaskStatus,
	onArchiveTask,
	onDeleteTask,
	onOpenTask,
}: TaskRowShortcutScopeProps) {
	const [hoverTaskId, setHoverTaskId] = useState<string | null>(null)
	const [focusTaskId, setFocusTaskId] = useState<string | null>(null)
	const chordStateRef = useRef<KeybindingChordState | null>(null)

	const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
	const selectedTaskIds = useMemo(() => [...selectedTaskIdSet], [selectedTaskIdSet])
	const selectedTasks = useMemo(
		() =>
			selectedTaskIds.flatMap((taskId) => {
				const task = taskById.get(taskId)
				return task ? [task] : []
			}),
		[selectedTaskIds, taskById],
	)
	const selection = useMemo(
		() => ({
			ids: selectedTaskIds,
			isSingleSelection: selectedTaskIds.length === 1,
			isMultiSelection: selectedTaskIds.length > 1,
		}),
		[selectedTaskIds],
	)
	const rowTarget = useMemo(
		() =>
			resolveTaskRowTarget({
				hover: toTaskRowRef(hoverTaskId),
				keyboardFocus: toTaskRowRef(focusTaskId),
				active: toTaskRowRef(activeTaskId),
				selection,
			}),
		[activeTaskId, focusTaskId, hoverTaskId, selection],
	)
	const targetTask = rowTarget.targetId ? taskById.get(rowTarget.targetId) : undefined

	const runtime = useMemo(() => {
		const actions = createTaskRowCommandActions({
			rowTarget,
			targetTask,
			selectedTasks,
			onArchiveTask,
			onDeleteTask,
			onOpenTask,
			onToggleTaskSelection,
			onToggleTaskStatus,
		})
		const context = createTaskRowCommandContext(rowTarget, selectedTaskIds)

		return new CommandRuntime({
			registry: new CommandRegistry(createTaskRowCommands(actions)),
			getContext: () => context,
		})
	}, [
		onArchiveTask,
		onDeleteTask,
		onOpenTask,
		onToggleTaskSelection,
		onToggleTaskStatus,
		rowTarget,
		selectedTaskIds,
		selectedTasks,
		targetTask,
	])

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (isBlockedByHigherLayer() || !rowTarget.hasTarget) {
				return
			}

			const result = matchKeybindingEvent({
				bindings: TASK_ROW_SHORTCUT_BINDINGS,
				event: normalizeKeyboardEvent(event),
				scope: 'row',
				chordState: chordStateRef.current,
				now: performance.now(),
			})

			if (result.status !== 'matched') {
				chordStateRef.current = null
				return
			}

			if (result.keybinding.preventDefault) {
				event.preventDefault()
			}

			window.setTimeout(() => {
				void runtime.execute(result.keybinding.commandId)
			}, 0)
		}

		window.addEventListener('keydown', handleKeyDown)
		return () => window.removeEventListener('keydown', handleKeyDown)
	}, [rowTarget.hasTarget, runtime])

	const state = useMemo<TaskRowShortcutState>(
		() => ({
			onRowHover: setHoverTaskId,
			onRowFocus: setFocusTaskId,
		}),
		[],
	)

	return <>{children(state)}</>
}

function toTaskRowRef(taskId: string | null | undefined): TaskRowRef | null {
	return taskId ? { targetId: taskId } : null
}

function createTaskRowCommandContext(
	rowTarget: CommandContext['rowTarget'],
	selectedTaskIds: string[],
) {
	return {
		...createEmptyCommandContext(),
		rowTarget,
		selection: {
			type: selectedTaskIds.length > 0 ? ('task' as const) : undefined,
			ids: selectedTaskIds,
			entities: selectedTaskIds.map((taskId) => ({
				id: taskId,
				type: 'task' as const,
				title: taskId,
			})),
			primaryEntity: selectedTaskIds[0]
				? {
						id: selectedTaskIds[0],
						type: 'task' as const,
						title: selectedTaskIds[0],
					}
				: undefined,
			source: selectedTaskIds.length > 0 ? ('row' as const) : ('none' as const),
			hasSelection: selectedTaskIds.length > 0,
			isSingleSelection: selectedTaskIds.length === 1,
			isMultiSelection: selectedTaskIds.length > 1,
		},
		focus: {
			isInputFocused: false,
			activePanel: 'main' as const,
		},
	}
}

function createTaskRowCommands(actions: TaskRowCommandActions): Command[] {
	return [
		bindTaskRowCommand(COMMAND_IDS.taskComplete, actions.complete),
		bindTaskRowCommand(COMMAND_IDS.taskSelect, actions.select),
		bindTaskRowCommand(COMMAND_IDS.taskPeek, actions.peek, { allowMultiSelection: false }),
		bindTaskRowCommand(COMMAND_IDS.taskOpenDetail, actions.openDetail, {
			allowMultiSelection: false,
		}),
		bindTaskRowCommand(COMMAND_IDS.taskArchive, actions.archive),
		bindTaskRowCommand(COMMAND_IDS.taskDelete, actions.deleteTask),
		bindTaskRowCommand(COMMAND_IDS.taskSetPriority, actions.openPriorityMenu),
		bindTaskRowCommand(COMMAND_IDS.taskSetStatus, actions.openStatusMenu),
		bindTaskRowCommand(COMMAND_IDS.taskOpenDateMenu, actions.openDateMenu),
	]
}

function bindTaskRowCommand(
	id: CommandId,
	run: Command['run'],
	options: { allowMultiSelection?: boolean } = {},
): Command {
	return {
		id,
		title: id,
		category: 'task',
		scope: ['task-list'],
		isEnabled: (ctx) =>
			ctx.rowTarget.hasTarget &&
			(options.allowMultiSelection !== false || !ctx.selection.isMultiSelection),
		getDisabledReason: () => ROW_COMMAND_DISABLED_REASON,
		run,
	}
}

function createTaskRowCommandActions({
	rowTarget,
	targetTask,
	selectedTasks,
	onArchiveTask,
	onDeleteTask,
	onOpenTask,
	onToggleTaskSelection,
	onToggleTaskStatus,
}: {
	rowTarget: CommandContext['rowTarget']
	targetTask?: TaskListItem
	selectedTasks: TaskListItem[]
	onToggleTaskSelection: (taskId: string) => void
	onToggleTaskStatus: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask: (taskId: string) => void
}): TaskRowCommandActions {
	const batchTasks = selectedTasks.length > 1 ? selectedTasks : targetTask ? [targetTask] : []

	return {
		complete: async () => {
			await Promise.all(batchTasks.map((task) => onToggleTaskStatus(task)))
		},
		select: () => {
			if (rowTarget.targetId) {
				onToggleTaskSelection(rowTarget.targetId)
			}
		},
		peek: () => {
			if (targetTask && selectedTasks.length <= 1) {
				onOpenTask(targetTask.id)
			}
		},
		openDetail: () => {
			if (targetTask && selectedTasks.length <= 1) {
				onOpenTask(targetTask.id)
			}
		},
		archive: async () => {
			if (!onArchiveTask) {
				return
			}
			await Promise.all(batchTasks.map((task) => onArchiveTask(task)))
		},
		deleteTask: async () => {
			if (!onDeleteTask) {
				return
			}
			await Promise.all(batchTasks.map((task) => onDeleteTask(task)))
		},
		openPriorityMenu: () => {
			openTaskPropertyPicker('task-priority-picker', batchTasks)
		},
		openStatusMenu: () => {
			openTaskPropertyPicker('task-status-picker', batchTasks)
		},
		openDateMenu: () => {
			openTaskPropertyPicker('task-date-picker', batchTasks)
		},
	}
}

function openTaskPropertyPicker(
	mode: 'task-priority-picker' | 'task-status-picker' | 'task-date-picker',
	tasks: TaskListItem[],
) {
	if (tasks.length === 0) {
		return
	}

	useDialogStore.getState().openCommand(mode, {
		type: 'task',
		ids: tasks.map((task) => task.id),
		entities: tasks.map((task) => ({
			id: task.id,
			type: 'task',
			title: task.title,
			subtitle: task.projectName ?? (task.inboxAt ? 'Inbox' : '独立事项'),
			status: task.status,
			priority: String(task.priority),
		})),
		primaryEntity: {
			id: tasks[0].id,
			type: 'task',
			title: tasks[0].title,
			subtitle: tasks[0].projectName ?? (tasks[0].inboxAt ? 'Inbox' : '独立事项'),
			status: tasks[0].status,
			priority: String(tasks[0].priority),
		},
		source: 'row',
		hasSelection: true,
		isSingleSelection: tasks.length === 1,
		isMultiSelection: tasks.length > 1,
	})
}

function isBlockedByHigherLayer() {
	return Boolean(
		document.querySelector(
			'[cmdk-root], [data-slot="dialog-content"], [data-slot="dropdown-menu-content"], [data-slot="context-menu-content"]',
		),
	)
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
