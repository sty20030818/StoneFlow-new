export type TaskSelectionSnapshot = {
	type: 'task'
	ids: string[]
	idSet: Set<string>
	count: number
	hasSelection: boolean
	isSingleSelection: boolean
	isMultiSelection: boolean
}

export type TaskSelectionFocusState = {
	selectedIds: string[]
	focusedId: string | null
	anchorId: string | null
}

/**
 * 保留当前选择顺序，同时剔除已经不在当前任务列表中的 id。
 */
export function pruneTaskSelection(selectedIds: string[], validIds: string[]) {
	const validIdSet = new Set(validIds)
	return selectedIds.filter((taskId) => validIdSet.has(taskId))
}

export function toggleTaskIdSelection(selectedIds: string[], taskId: string) {
	return selectedIds.includes(taskId)
		? selectedIds.filter((currentTaskId) => currentTaskId !== taskId)
		: [...selectedIds, taskId]
}

export function moveTaskSelectionFocus(
	visibleIds: string[],
	currentFocusedId: string | null,
	delta: number,
) {
	if (visibleIds.length === 0) {
		return null
	}

	const currentIndex = currentFocusedId ? visibleIds.indexOf(currentFocusedId) : -1
	const nextIndex =
		currentIndex === -1
			? delta >= 0
				? 0
				: visibleIds.length - 1
			: clampIndex(currentIndex + delta, visibleIds.length)

	return visibleIds[nextIndex] ?? null
}

export function selectTaskRange(visibleIds: string[], anchorId: string, targetId: string) {
	const anchorIndex = visibleIds.indexOf(anchorId)
	const targetIndex = visibleIds.indexOf(targetId)

	if (anchorIndex === -1 || targetIndex === -1) {
		return targetId ? [targetId] : []
	}

	const startIndex = Math.min(anchorIndex, targetIndex)
	const endIndex = Math.max(anchorIndex, targetIndex)
	return visibleIds.slice(startIndex, endIndex + 1)
}

export function mergeTaskSelectionRange(
	visibleIds: string[],
	selectedIds: string[],
	rangeIds: string[],
) {
	const nextSelectedIdSet = new Set([...selectedIds, ...rangeIds])
	return visibleIds.filter((taskId) => nextSelectedIdSet.has(taskId))
}

export function toggleTaskSelectionByVisibleOrder(
	visibleIds: string[],
	selectedIds: string[],
	taskId: string,
) {
	const nextSelectedIdSet = new Set(selectedIds)
	if (nextSelectedIdSet.has(taskId)) {
		nextSelectedIdSet.delete(taskId)
	} else {
		nextSelectedIdSet.add(taskId)
	}

	return visibleIds.filter((visibleId) => nextSelectedIdSet.has(visibleId))
}

export function pruneTaskSelectionFocusState(
	state: TaskSelectionFocusState,
	validIds: string[],
): TaskSelectionFocusState {
	const selectedIds = pruneTaskSelection(state.selectedIds, validIds)
	const validIdSet = new Set(validIds)
	const focusedId =
		state.focusedId && validIdSet.has(state.focusedId) ? state.focusedId : (selectedIds[0] ?? null)
	const anchorId =
		state.anchorId && validIdSet.has(state.anchorId)
			? state.anchorId
			: (selectedIds[0] ?? focusedId)

	return {
		selectedIds,
		focusedId,
		anchorId,
	}
}

export function buildTaskSelectionSnapshot(selectedIds: string[]): TaskSelectionSnapshot {
	const ids = [...selectedIds]
	const count = ids.length

	return {
		type: 'task',
		ids,
		idSet: new Set(ids),
		count,
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}

function clampIndex(index: number, length: number) {
	return Math.min(Math.max(index, 0), length - 1)
}
