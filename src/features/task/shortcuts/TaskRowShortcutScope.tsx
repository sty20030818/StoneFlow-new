import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import {
	TASK_BULK_ACTION_IDS,
	createTaskBulkSelectionSnapshotFromTasks,
	useBulkActionContext,
} from '@/features/bulk-action'
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
	focusedTaskId?: string | null
	selectedTaskIdSet: Set<string>
	onToggleTaskSelection: (taskId: string) => void
	onSetFocusedTask?: (taskId: string | null) => void
	onMoveTaskFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearTaskSelection?: () => void
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

type ShiftToggleSession = {
	active: boolean
	cursorId: string | null
	direction: -1 | 1 | null
	lastToggledId: string | null
}

const EMPTY_SHIFT_TOGGLE_SESSION: ShiftToggleSession = {
	active: false,
	cursorId: null,
	direction: null,
	lastToggledId: null,
}

export function TaskRowShortcutScope({
	children,
	tasks,
	activeTaskId,
	focusedTaskId: externalFocusedTaskId = null,
	selectedTaskIdSet,
	onToggleTaskSelection,
	onSetFocusedTask,
	onMoveTaskFocus,
	onClearTaskSelection,
	onOpenTask,
}: TaskRowShortcutScopeProps) {
	const [focusTaskId, setFocusTaskId] = useState<string | null>(externalFocusedTaskId)
	const shiftToggleSessionRef = useRef<ShiftToggleSession>(EMPTY_SHIFT_TOGGLE_SESSION)
	const chordStateRef = useRef<KeybindingChordState | null>(null)
	const { runBulkAction } = useBulkActionContext()

	useEffect(() => {
		setFocusTaskId(externalFocusedTaskId)
	}, [externalFocusedTaskId])

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
				hover: null,
				keyboardFocus: toTaskRowRef(focusTaskId),
				active: toTaskRowRef(activeTaskId),
				selection,
			}),
		[activeTaskId, focusTaskId, selection],
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
			onToggleTaskSelection,
		})
		const context = createTaskRowCommandContext(rowTarget, selectedTaskIds)

		return new CommandRuntime({
			registry: new CommandRegistry(createTaskRowCommands(actions)),
			getContext: () => context,
		})
	}, [
		onClearTaskSelection,
		onOpenTask,
		onToggleTaskSelection,
		rowTarget,
		runBulkAction,
		selectedTaskIds,
		selectedTasks,
		targetTask,
	])

	useEffect(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if (isBlockedByHigherLayer()) {
				return
			}

			const navigationResult = handleTaskRowNavigationKey({
				event,
				focusedTaskId: focusTaskId,
				tasks,
				moveFocus: onMoveTaskFocus,
				onToggleTaskSelection,
				shiftToggleSession: shiftToggleSessionRef.current,
				setShiftToggleSession: (session) => {
					shiftToggleSessionRef.current = session
				},
				setLocalFocusTaskId: setFocusTaskId,
			})
			if (navigationResult === 'handled') {
				return
			}

			if (!rowTarget.hasTarget && selectedTaskIds.length === 0) {
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
	}, [
		focusTaskId,
		onMoveTaskFocus,
		onToggleTaskSelection,
		rowTarget.hasTarget,
		runtime,
		selectedTaskIds.length,
		tasks,
	])

	const state = useMemo<TaskRowShortcutState>(
		() => ({
			onRowHover: (taskId) => {
				if (!taskId) {
					return
				}
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				setFocusTaskId(taskId)
				onSetFocusedTask?.(taskId)
			},
			onRowFocus: (taskId) => {
				if (!taskId) {
					return
				}
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				setFocusTaskId(taskId)
				onSetFocusedTask?.(taskId)
			},
		}),
		[onSetFocusedTask],
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
			(ctx.rowTarget.hasTarget || ctx.selection.hasSelection) &&
			(options.allowMultiSelection !== false || !ctx.selection.isMultiSelection),
		getDisabledReason: () => ROW_COMMAND_DISABLED_REASON,
		run,
	}
}

function createTaskRowCommandActions({
	rowTarget,
	targetTask,
	selectedTasks,
	runBulkAction,
	onClearTaskSelection,
	onOpenTask,
	onToggleTaskSelection,
}: {
	rowTarget: CommandContext['rowTarget']
	targetTask?: TaskListItem
	selectedTasks: TaskListItem[]
	runBulkAction: ReturnType<typeof useBulkActionContext>['runBulkAction']
	onClearTaskSelection?: () => void
	onToggleTaskSelection: (taskId: string) => void
	onOpenTask: (taskId: string) => void
}): TaskRowCommandActions {
	const batchTasks = selectedTasks.length > 0 ? selectedTasks : targetTask ? [targetTask] : []

	async function runTaskBulkAction(actionId: string) {
		const snapshot = createTaskBulkSelectionSnapshotFromTasks(batchTasks, 'row-shortcut')
		const result = await runBulkAction(actionId, snapshot)
		if (result.status === 'success' && result.shouldClearSelection) {
			onClearTaskSelection?.()
		}
	}

	return {
		complete: async () => {
			await runTaskBulkAction(TASK_BULK_ACTION_IDS.completeSelected)
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
			await runTaskBulkAction(TASK_BULK_ACTION_IDS.archiveSelected)
		},
		deleteTask: async () => {
			await runTaskBulkAction(TASK_BULK_ACTION_IDS.deleteSelected)
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

function handleTaskRowNavigationKey({
	event,
	focusedTaskId,
	tasks,
	moveFocus,
	onToggleTaskSelection,
	shiftToggleSession,
	setShiftToggleSession,
	setLocalFocusTaskId,
}: {
	event: KeyboardEvent
	focusedTaskId: string | null
	tasks: TaskListItem[]
	moveFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onToggleTaskSelection: (taskId: string) => void
	shiftToggleSession: ShiftToggleSession
	setShiftToggleSession: (session: ShiftToggleSession) => void
	setLocalFocusTaskId: (taskId: string | null) => void
}) {
	if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
		return 'ignored'
	}

	if (event.defaultPrevented || event.isComposing || isEditableEventTarget(event.target)) {
		return 'ignored'
	}

	if (!moveFocus) {
		return 'ignored'
	}

	event.preventDefault()
	const delta = event.key === 'ArrowDown' ? 1 : -1
	if (event.shiftKey) {
		const nextSession = handleShiftToggleNavigation({
			delta,
			focusedTaskId,
			tasks,
			shiftToggleSession,
			onToggleTaskSelection,
			setLocalFocusTaskId,
		})
		setShiftToggleSession(nextSession)

		return 'handled'
	}

	const nextTaskId = moveFocus(event.key === 'ArrowDown' ? 1 : -1, {
		preserveAnchor: false,
		selectRange: false,
	})
	setShiftToggleSession(EMPTY_SHIFT_TOGGLE_SESSION)
	setLocalFocusTaskId(nextTaskId)

	return 'handled'
}

function handleShiftToggleNavigation({
	delta,
	focusedTaskId,
	tasks,
	shiftToggleSession,
	onToggleTaskSelection,
	setLocalFocusTaskId,
}: {
	delta: -1 | 1
	focusedTaskId: string | null
	tasks: TaskListItem[]
	shiftToggleSession: ShiftToggleSession
	onToggleTaskSelection: (taskId: string) => void
	setLocalFocusTaskId: (taskId: string | null) => void
}): ShiftToggleSession {
	const visibleTaskIds = tasks.map((task) => task.id)
	if (visibleTaskIds.length === 0) {
		setLocalFocusTaskId(null)
		return EMPTY_SHIFT_TOGGLE_SESSION
	}

	const cursorId = resolveShiftToggleCursorId({
		delta,
		focusedTaskId,
		visibleTaskIds,
		shiftToggleSession,
	})
	if (!cursorId) {
		return EMPTY_SHIFT_TOGGLE_SESSION
	}

	if (
		shiftToggleSession.active &&
		shiftToggleSession.direction === delta &&
		shiftToggleSession.lastToggledId === cursorId &&
		isTaskSelectionBoundary(visibleTaskIds, cursorId, delta)
	) {
		setLocalFocusTaskId(cursorId)
		return shiftToggleSession
	}

	onToggleTaskSelection(cursorId)
	setLocalFocusTaskId(cursorId)

	return {
		active: true,
		cursorId: getAdjacentTaskId(visibleTaskIds, cursorId, delta),
		direction: delta,
		lastToggledId: cursorId,
	}
}

function resolveShiftToggleCursorId({
	delta,
	focusedTaskId,
	visibleTaskIds,
	shiftToggleSession,
}: {
	delta: -1 | 1
	focusedTaskId: string | null
	visibleTaskIds: string[]
	shiftToggleSession: ShiftToggleSession
}) {
	if (!shiftToggleSession.active) {
		return getValidTaskId(visibleTaskIds, focusedTaskId) ?? visibleTaskIds[0] ?? null
	}

	if (
		shiftToggleSession.direction !== delta &&
		getValidTaskId(visibleTaskIds, shiftToggleSession.lastToggledId)
	) {
		return shiftToggleSession.lastToggledId
	}

	return (
		getValidTaskId(visibleTaskIds, shiftToggleSession.cursorId) ??
		getValidTaskId(visibleTaskIds, focusedTaskId) ??
		visibleTaskIds[0] ??
		null
	)
}

function getAdjacentTaskId(taskIds: string[], taskId: string, delta: -1 | 1) {
	const index = taskIds.indexOf(taskId)
	if (index < 0) {
		return taskIds[0] ?? null
	}

	const nextIndex = Math.min(Math.max(index + delta, 0), taskIds.length - 1)
	return taskIds[nextIndex] ?? null
}

function getValidTaskId(taskIds: string[], taskId: string | null) {
	return taskId && taskIds.includes(taskId) ? taskId : null
}

function isTaskSelectionBoundary(taskIds: string[], taskId: string, delta: -1 | 1) {
	const index = taskIds.indexOf(taskId)
	return (delta < 0 && index === 0) || (delta > 0 && index === taskIds.length - 1)
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

function isEditableEventTarget(target: EventTarget | null) {
	if (typeof HTMLElement === 'undefined' || !(target instanceof HTMLElement)) {
		return false
	}

	if (target.isContentEditable) {
		return true
	}

	const tagName = target.tagName
	return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
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
