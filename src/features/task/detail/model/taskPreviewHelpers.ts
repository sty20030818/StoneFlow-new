import type { TaskPreviewSource } from './taskPreviewTypes'

export function resolvePreviewTarget({
	taskById,
	hoveredTaskId,
	focusedTaskId,
	activeTaskId,
}: {
	taskById: TaskPreviewSource['taskById']
	hoveredTaskId: string | null
	focusedTaskId: string | null
	activeTaskId: string | null
}) {
	if (hasValidTask(taskById, hoveredTaskId)) {
		return hoveredTaskId
	}

	if (hasValidTask(taskById, focusedTaskId)) {
		return focusedTaskId
	}

	if (hasValidTask(taskById, activeTaskId)) {
		return activeTaskId
	}

	return null
}

export function hasValidTask(
	taskById: TaskPreviewSource['taskById'] | null | undefined,
	taskId: string | null | undefined,
) {
	return Boolean(taskId && taskById?.has(taskId))
}

export function areSameTaskPreviewSource(
	current: TaskPreviewSource | null,
	next: TaskPreviewSource | null,
) {
	return (
		current === next ||
		Boolean(
			current &&
			next &&
			current.focusedTaskId === next.focusedTaskId &&
			current.activeTaskId === next.activeTaskId &&
			areSameTaskIndex(current.taskById, next.taskById),
		)
	)
}

function areSameTaskIndex(
	current: TaskPreviewSource['taskById'],
	next: TaskPreviewSource['taskById'],
) {
	if (current === next) {
		return true
	}

	if (current.size !== next.size) {
		return false
	}

	for (const [taskId, task] of current) {
		if (next.get(taskId) !== task) {
			return false
		}
	}

	return true
}
