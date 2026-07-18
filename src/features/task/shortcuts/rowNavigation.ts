import type { TaskListItem } from '@/shared/types'

import {
	EMPTY_SHIFT_TOGGLE_SESSION,
	type HoverUpdateOptions,
	type KeyboardNavigationDirection,
	type ShiftToggleSession,
} from './types'
import { isEditableEventTarget } from './rowShortcutGuards'

/**
 * 处理行内上下键导航（含 Shift 扩选）。
 */
export function handleTaskRowNavigationKey({
	event,
	hoveredId,
	tasks,
	onToggleTaskSelection,
	shiftToggleSession,
	setShiftToggleSession,
	setKeyboardHoveredId,
}: {
	event: KeyboardEvent
	hoveredId: string | null
	tasks: TaskListItem[]
	onToggleTaskSelection: (taskId: string) => void
	shiftToggleSession: ShiftToggleSession
	setShiftToggleSession: (session: ShiftToggleSession) => void
	setKeyboardHoveredId: (taskId: string | null, options?: HoverUpdateOptions) => void
}) {
	if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') {
		return 'ignored'
	}

	if (event.defaultPrevented || event.isComposing || isEditableEventTarget(event.target)) {
		return 'ignored'
	}

	const delta = event.key === 'ArrowDown' ? 1 : -1
	const navigationStartId = hoveredId

	if (event.shiftKey) {
		const nextSession = handleShiftToggleNavigation({
			delta,
			startTargetId: navigationStartId,
			tasks,
			shiftToggleSession,
			onToggleTaskSelection,
			setKeyboardTargetId: setKeyboardHoveredId,
		})
		setShiftToggleSession(nextSession)
		return 'handled'
	}

	const visibleTaskIds = tasks.map((task) => task.id)
	const nextTaskId = moveVisibleTaskFocus({
		taskIds: visibleTaskIds,
		startTargetId: navigationStartId,
		delta,
	})
	setShiftToggleSession(EMPTY_SHIFT_TOGGLE_SESSION)
	setKeyboardHoveredId(nextTaskId, { direction: delta })

	return 'handled'
}

function handleShiftToggleNavigation({
	delta,
	startTargetId,
	tasks,
	shiftToggleSession,
	onToggleTaskSelection,
	setKeyboardTargetId,
}: {
	delta: KeyboardNavigationDirection
	startTargetId: string | null
	tasks: TaskListItem[]
	shiftToggleSession: ShiftToggleSession
	onToggleTaskSelection: (taskId: string) => void
	setKeyboardTargetId: (taskId: string | null, options?: HoverUpdateOptions) => void
}): ShiftToggleSession {
	const visibleTaskIds = tasks.map((task) => task.id)
	if (visibleTaskIds.length === 0) {
		setKeyboardTargetId(null)
		return EMPTY_SHIFT_TOGGLE_SESSION
	}

	const cursorId = resolveShiftToggleCursorId({
		delta,
		startTargetId,
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
		setKeyboardTargetId(cursorId, { direction: delta })
		return shiftToggleSession
	}

	onToggleTaskSelection(cursorId)
	setKeyboardTargetId(cursorId, { direction: delta })

	return {
		active: true,
		cursorId: getAdjacentTaskId(visibleTaskIds, cursorId, delta),
		direction: delta,
		lastToggledId: cursorId,
	}
}

function resolveShiftToggleCursorId({
	delta,
	startTargetId,
	visibleTaskIds,
	shiftToggleSession,
}: {
	delta: KeyboardNavigationDirection
	startTargetId: string | null
	visibleTaskIds: string[]
	shiftToggleSession: ShiftToggleSession
}) {
	if (!shiftToggleSession.active) {
		return getValidTaskId(visibleTaskIds, startTargetId) ?? visibleTaskIds[0] ?? null
	}

	if (
		shiftToggleSession.direction !== delta &&
		getValidTaskId(visibleTaskIds, shiftToggleSession.lastToggledId)
	) {
		return shiftToggleSession.lastToggledId
	}

	return (
		getValidTaskId(visibleTaskIds, shiftToggleSession.cursorId) ??
		getValidTaskId(visibleTaskIds, startTargetId) ??
		visibleTaskIds[0] ??
		null
	)
}

function moveVisibleTaskFocus({
	taskIds,
	startTargetId,
	delta,
}: {
	taskIds: string[]
	startTargetId: string | null
	delta: KeyboardNavigationDirection
}) {
	if (taskIds.length === 0) {
		return null
	}

	if (!startTargetId) {
		return taskIds[0] ?? null
	}

	const index = taskIds.indexOf(startTargetId)
	if (index < 0) {
		return taskIds[0] ?? null
	}

	return getAdjacentTaskId(taskIds, startTargetId, delta)
}

function getAdjacentTaskId(taskIds: string[], taskId: string, delta: KeyboardNavigationDirection) {
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

function isTaskSelectionBoundary(
	taskIds: string[],
	taskId: string,
	delta: KeyboardNavigationDirection,
) {
	const index = taskIds.indexOf(taskId)
	return (delta < 0 && index === 0) || (delta > 0 && index === taskIds.length - 1)
}
