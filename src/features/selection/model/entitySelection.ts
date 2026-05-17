import {
	buildTaskSelectionSnapshot,
	mergeTaskSelectionRange,
	moveTaskSelectionFocus,
	pruneTaskSelectionFocusState,
	selectTaskRange,
	toggleTaskSelectionByVisibleOrder,
	type TaskSelectionFocusState,
} from '@/features/task/model/taskSelection'

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

export function pruneEntitySelectionFocusState(
	state: EntitySelectionState,
	validIds: string[],
): EntitySelectionState {
	const nextState = pruneTaskSelectionFocusState(
		{
			selectedIds: state.selectedIds,
			focusedId: state.focusedId,
			anchorId: state.selectionAnchorId,
		} satisfies TaskSelectionFocusState,
		validIds,
	)

	return {
		selectedIds: nextState.selectedIds,
		focusedId: nextState.focusedId,
		selectionAnchorId: nextState.anchorId,
	}
}

export function buildEntitySelectionSnapshot(selectedIds: string[]): EntitySelectionSnapshot {
	const snapshot = buildTaskSelectionSnapshot(selectedIds)

	return {
		type: 'entity',
		ids: snapshot.ids,
		idSet: snapshot.idSet,
		count: snapshot.count,
		hasSelection: snapshot.hasSelection,
		isSingleSelection: snapshot.isSingleSelection,
		isMultiSelection: snapshot.isMultiSelection,
	}
}

export {
	mergeTaskSelectionRange as mergeEntitySelectionRange,
	moveTaskSelectionFocus as moveEntitySelectionFocus,
	selectTaskRange as selectEntityRange,
	toggleTaskSelectionByVisibleOrder as toggleEntitySelectionByVisibleOrder,
}
