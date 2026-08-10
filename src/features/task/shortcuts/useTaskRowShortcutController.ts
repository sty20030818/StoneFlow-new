import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useBulkActionContext } from '@/features/bulk-action'
import {
	CommandRegistry,
	CommandRuntime,
	COMMAND_IDS,
	matchKeybindingEvent,
	SHORTCUT_DISPATCH_PRIORITY,
	useShortcutDispatcher,
	useShortcutRegistry,
} from '@/features/command'
import type { TaskListItem } from '@/shared/types'
import { useTaskPreviewController } from '@/features/task/detail'

import { resolveTaskRowTarget } from './rowTargetResolver'
import {
	createTaskRowCommandActions,
	createTaskRowCommandContext,
	createTaskRowCommands,
} from './rowCommandRuntime'
import { handleTaskRowNavigationKey } from './rowNavigation'
import { scrollKeyboardTargetIntoView } from './keyboardScroll'
import {
	getCommandTargetId,
	hasPointerMovedEnough,
	isBlockedByHigherLayer,
	normalizeKeyboardEvent,
	toTaskRowRef,
} from './rowShortcutGuards'
import {
	EMPTY_SHIFT_TOGGLE_SESSION,
	type HoverSource,
	type HoverUpdateOptions,
	type PointerPoint,
	type ShiftToggleSession,
	type TaskRowShortcutState,
} from './types'

type UseTaskRowShortcutControllerArgs = {
	tasks: TaskListItem[]
	activeTaskId: string | null
	focusedTaskId: string | null
	selectedTaskIdSet: Set<string>
	onToggleTaskSelection: (taskId: string) => void
	onSetFocusedTask?: (taskId: string | null) => void
	onClearTaskSelection?: () => void
	onSelectAllTasks?: (taskIds: string[]) => void
	onOpenTask: (taskId: string) => void
	onPeekTask?: (taskId: string, source: 'keyboard' | 'pointer') => void
}

/**
 * 行快捷键内部状态与优先级分发器注册（供 Scope 壳消费）。
 */
export function useTaskRowShortcutController({
	tasks,
	activeTaskId,
	focusedTaskId,
	selectedTaskIdSet,
	onToggleTaskSelection,
	onSetFocusedTask,
	onClearTaskSelection,
	onSelectAllTasks,
	onOpenTask,
	onPeekTask,
}: UseTaskRowShortcutControllerArgs): TaskRowShortcutState {
	const shortcutRegistry = useShortcutRegistry()
	const rowShortcutBindings = useMemo(() => shortcutRegistry.getByScope('row'), [shortcutRegistry])
	const listShortcutBindings = useMemo(
		() => shortcutRegistry.getByScope('list'),
		[shortcutRegistry],
	)
	const { cancelScheduledClose, setHoveredTask } = useTaskPreviewController()
	const [hoveredId, setHoveredId] = useState<string | null>(focusedTaskId)
	const [hoverSource, setHoverSource] = useState<HoverSource | null>(
		focusedTaskId ? 'keyboard' : null,
	)

	const hoveredIdRef = useRef<string | null>(focusedTaskId)
	const hoverSourceRef = useRef<HoverSource | null>(focusedTaskId ? 'keyboard' : null)
	const suppressPointerHoverRef = useRef(false)
	const frozenPointerPointRef = useRef<PointerPoint | null>(null)
	const lastPointerPointRef = useRef<PointerPoint | null>(null)
	const shiftToggleSessionRef = useRef<ShiftToggleSession>(EMPTY_SHIFT_TOGGLE_SESSION)

	const { runBulkAction } = useBulkActionContext()

	useEffect(() => {
		function handleWindowPointerMove(event: PointerEvent) {
			lastPointerPointRef.current = {
				x: event.clientX,
				y: event.clientY,
			}
		}

		window.addEventListener('pointermove', handleWindowPointerMove)
		return () => window.removeEventListener('pointermove', handleWindowPointerMove)
	}, [])

	useEffect(() => {
		if (hoveredIdRef.current && !tasks.some((task) => task.id === hoveredIdRef.current)) {
			hoveredIdRef.current = null
			hoverSourceRef.current = null
			setHoveredId(null)
			setHoverSource(null)
			onSetFocusedTask?.(null)
		}
	}, [onSetFocusedTask, tasks])

	const selectedTaskIds = useMemo(() => [...selectedTaskIdSet], [selectedTaskIdSet])
	const taskById = useMemo(() => new Map(tasks.map((task) => [task.id, task])), [tasks])
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
				hover: toTaskRowRef(hoveredId),
				active: toTaskRowRef(activeTaskId),
				selection,
			}),
		[activeTaskId, hoveredId, selection],
	)
	const targetTask = rowTarget.targetId ? taskById.get(rowTarget.targetId) : undefined
	const commandTargetId = useMemo(
		() =>
			getCommandTargetId({
				rowTargetId: rowTarget.targetId ?? null,
				hoveredId,
				activeTaskId,
			}),
		[activeTaskId, hoveredId, rowTarget.targetId],
	)

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
		const context = createTaskRowCommandContext(
			rowTarget,
			selectedTaskIds,
			hoveredId ?? focusedTaskId,
		)

		return new CommandRuntime({
			registry: new CommandRegistry(createTaskRowCommands(actions)),
			getContext: () => context,
		})
	}, [
		onClearTaskSelection,
		onOpenTask,
		onPeekTask,
		onToggleTaskSelection,
		rowTarget,
		runBulkAction,
		selectedTaskIds,
		selectedTasks,
		targetTask,
		hoveredId,
		focusedTaskId,
	])

	const updateHoveredRow = useCallback(
		(taskId: string | null, source: HoverSource | null, options: HoverUpdateOptions = {}) => {
			hoveredIdRef.current = taskId
			hoverSourceRef.current = source
			// 指针与键盘都更新目标 id（命令需要）；Board 行 isHovered 仅用 keyboard
			setHoveredId(taskId)
			setHoverSource(source)

			if (source === 'pointer' && taskId) {
				setHoveredTask(taskId, 'pointer')
				cancelScheduledClose()
			}

			if (options.syncExternal !== false) {
				onSetFocusedTask?.(taskId)
			}

			if (
				taskId &&
				source === 'keyboard' &&
				options.direction &&
				options.scrollIntoView !== false
			) {
				scrollKeyboardTargetIntoView({
					taskId,
					direction: options.direction,
					fromTaskId: options.fromTaskId ?? null,
				})
			}
		},
		[cancelScheduledClose, onSetFocusedTask, setHoveredTask],
	)

	useEffect(() => {
		if (!focusedTaskId) {
			return
		}

		if (hoverSourceRef.current === 'pointer') {
			return
		}

		updateHoveredRow(focusedTaskId, 'keyboard', {
			syncExternal: false,
			scrollIntoView: false,
		})
	}, [focusedTaskId, updateHoveredRow])

	useEffect(() => {
		const previewHoveredTaskId = hoverSource === 'pointer' ? hoveredId : null
		setHoveredTask(previewHoveredTaskId, previewHoveredTaskId ? 'pointer' : null)

		if (previewHoveredTaskId) {
			cancelScheduledClose()
		}
	}, [cancelScheduledClose, hoveredId, hoverSource, setHoveredTask])

	useShortcutDispatcher(SHORTCUT_DISPATCH_PRIORITY.row, (event) => {
		if (isBlockedByHigherLayer()) {
			return 'unhandled'
		}

		const listResult = matchKeybindingEvent({
			bindings: listShortcutBindings,
			event: normalizeKeyboardEvent(event),
			scope: 'list',
			chordState: null,
			now: performance.now(),
		})

		if (
			listResult.status === 'matched' &&
			listResult.keybinding.commandId === COMMAND_IDS.selectionSelectAll
		) {
			if (listResult.keybinding.preventDefault) {
				event.preventDefault()
			}
			shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
			onSelectAllTasks?.(tasks.map((task) => task.id))
			updateHoveredRow(null, null, {
				scrollIntoView: false,
			})
			return 'handled'
		}

		if (
			listResult.status === 'matched' &&
			listResult.keybinding.commandId === COMMAND_IDS.selectionClear
		) {
			if (selectedTaskIds.length === 0) {
				return 'unhandled'
			}
			if (listResult.keybinding.preventDefault) {
				event.preventDefault()
			}
			shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
			onClearTaskSelection?.()
			return 'handled'
		}

		if (
			listResult.status === 'matched' &&
			isSelectionNavigationCommand(listResult.keybinding.commandId)
		) {
			const navigationResult = handleTaskRowNavigationKey({
				event,
				hoveredId: hoveredIdRef.current,
				tasks,
				onToggleTaskSelection,
				shiftToggleSession: shiftToggleSessionRef.current,
				setShiftToggleSession: (session) => {
					shiftToggleSessionRef.current = session
				},
				setKeyboardHoveredId: (taskId, options) => {
					const previousHoveredId = hoveredIdRef.current
					suppressPointerHoverRef.current = true
					frozenPointerPointRef.current = lastPointerPointRef.current
					updateHoveredRow(taskId, taskId ? 'keyboard' : null, {
						...options,
						fromTaskId: options?.fromTaskId ?? previousHoveredId,
					})
				},
			})
			if (navigationResult === 'handled') {
				if (listResult.keybinding.preventDefault) {
					event.preventDefault()
				}
				return 'handled'
			}
		}

		if (!rowTarget.hasTarget && selectedTaskIds.length === 0) {
			return 'unhandled'
		}

		const result = matchKeybindingEvent({
			bindings: rowShortcutBindings,
			event: normalizeKeyboardEvent(event),
			scope: 'row',
			chordState: null,
			now: performance.now(),
		})

		if (result.status !== 'matched') {
			return 'unhandled'
		}

		if (result.keybinding.preventDefault) {
			event.preventDefault()
		}

		window.setTimeout(() => {
			void runtime.execute(result.keybinding.commandId)
		}, 0)
		return 'handled'
	})

	return useMemo<TaskRowShortcutState>(
		() => ({
			hoveredId,
			hoverSource,
			commandTargetId,
			onRowHover: (taskId) => {
				if (taskId === null) {
					if (isBlockedByHigherLayer()) {
						return
					}

					if (hoverSourceRef.current === 'pointer') {
						updateHoveredRow(null, null)
					}
					return
				}

				if (suppressPointerHoverRef.current) {
					return
				}

				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				updateHoveredRow(taskId, 'pointer')
			},
			onRowPointerMove: (taskId, point) => {
				if (
					suppressPointerHoverRef.current &&
					!hasPointerMovedEnough(frozenPointerPointRef.current, point)
				) {
					return
				}

				lastPointerPointRef.current = point
				suppressPointerHoverRef.current = false
				frozenPointerPointRef.current = null
				shiftToggleSessionRef.current = EMPTY_SHIFT_TOGGLE_SESSION
				updateHoveredRow(taskId, 'pointer')
			},
		}),
		[commandTargetId, hoveredId, hoverSource, updateHoveredRow],
	)
}

function isSelectionNavigationCommand(commandId: string) {
	return (
		commandId === COMMAND_IDS.selectionFocusPrevious ||
		commandId === COMMAND_IDS.selectionFocusNext ||
		commandId === COMMAND_IDS.selectionExtendPrevious ||
		commandId === COMMAND_IDS.selectionExtendNext
	)
}
