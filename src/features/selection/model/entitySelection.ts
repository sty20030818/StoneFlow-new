export type EntitySelectionSnapshot = {
	type: 'entity'
	ids: string[]
	idSet: Set<string>
	count: number
	hasSelection: boolean
	isSingleSelection: boolean
	isMultiSelection: boolean
}

export type EntitySelectionState = {
	selectedIds: string[]
	focusedId: string | null
	selectionAnchorId: string | null
}

export function moveEntitySelectionFocus(
	visibleIds: string[],
	currentFocusedId: string | null,
	delta: number,
) {
	if (visibleIds.length === 0) return null

	const currentIndex = currentFocusedId ? visibleIds.indexOf(currentFocusedId) : -1
	const nextIndex =
		currentIndex === -1
			? delta >= 0
				? 0
				: visibleIds.length - 1
			: Math.min(Math.max(currentIndex + delta, 0), visibleIds.length - 1)

	return visibleIds[nextIndex] ?? null
}

export function selectEntityRange(visibleIds: string[], anchorId: string, targetId: string) {
	const anchorIndex = visibleIds.indexOf(anchorId)
	const targetIndex = visibleIds.indexOf(targetId)

	if (anchorIndex === -1 || targetIndex === -1) return targetId ? [targetId] : []

	const startIndex = Math.min(anchorIndex, targetIndex)
	const endIndex = Math.max(anchorIndex, targetIndex)
	return visibleIds.slice(startIndex, endIndex + 1)
}

export function mergeEntitySelectionRange(
	visibleIds: string[],
	selectedIds: string[],
	rangeIds: string[],
) {
	const nextSelectedIdSet = new Set([...selectedIds, ...rangeIds])
	return visibleIds.filter((entityId) => nextSelectedIdSet.has(entityId))
}

export function toggleEntitySelectionByVisibleOrder(
	visibleIds: string[],
	selectedIds: string[],
	entityId: string,
) {
	const nextSelectedIdSet = new Set(selectedIds)
	if (nextSelectedIdSet.has(entityId)) {
		nextSelectedIdSet.delete(entityId)
	} else {
		nextSelectedIdSet.add(entityId)
	}

	return visibleIds.filter((visibleId) => nextSelectedIdSet.has(visibleId))
}

export function pruneEntitySelectionFocusState(
	state: EntitySelectionState,
	validIds: string[],
): EntitySelectionState {
	const validIdSet = new Set(validIds)
	const selectedIds = state.selectedIds.filter((entityId) => validIdSet.has(entityId))
	const focusedId =
		state.focusedId && validIdSet.has(state.focusedId) ? state.focusedId : (selectedIds[0] ?? null)
	const selectionAnchorId =
		state.selectionAnchorId && validIdSet.has(state.selectionAnchorId)
			? state.selectionAnchorId
			: (selectedIds[0] ?? focusedId)

	return { selectedIds, focusedId, selectionAnchorId }
}

export function buildEntitySelectionSnapshot(selectedIds: string[]): EntitySelectionSnapshot {
	const ids = [...selectedIds]
	const count = ids.length

	return {
		type: 'entity',
		ids,
		idSet: new Set(ids),
		count,
		hasSelection: count > 0,
		isSingleSelection: count === 1,
		isMultiSelection: count > 1,
	}
}
