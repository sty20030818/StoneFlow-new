export type TaskSelectionSnapshot = {
	type: 'task'
	ids: string[]
	idSet: Set<string>
	count: number
	hasSelection: boolean
	isSingleSelection: boolean
	isMultiSelection: boolean
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
