import type { TaskListItem } from '@/shared/types'

import type { TaskPreviewSource } from './taskPreviewTypes'

export function resolvePreviewTarget({
	taskIds,
	hoveredTaskId,
	focusedTaskId,
	activeTaskId,
}: {
	taskIds: string[]
	hoveredTaskId: string | null
	focusedTaskId: string | null
	activeTaskId: string | null
}) {
	if (hasValidTask(taskIds, hoveredTaskId)) {
		return hoveredTaskId
	}

	if (hasValidTask(taskIds, focusedTaskId)) {
		return focusedTaskId
	}

	if (hasValidTask(taskIds, activeTaskId)) {
		return activeTaskId
	}

	return null
}

export function hasValidTask(
	taskIds: string[] | TaskListItem[],
	taskId: string | null | undefined,
) {
	if (!taskId) {
		return false
	}

	if (taskIds.length === 0) {
		return false
	}

	if (typeof taskIds[0] === 'string') {
		return (taskIds as string[]).includes(taskId)
	}

	return (taskIds as TaskListItem[]).some((task) => task.id === taskId)
}

export function areSameTaskPreviewSource(
	current: TaskPreviewSource | null,
	next: TaskPreviewSource | null,
) {
	if (current === next) {
		return true
	}

	if (!current || !next) {
		return false
	}

	if (
		current.focusedTaskId !== next.focusedTaskId ||
		current.activeTaskId !== next.activeTaskId ||
		current.tasks.length !== next.tasks.length
	) {
		return false
	}

	return current.tasks.every((task, index) => task.id === next.tasks[index]?.id)
}
