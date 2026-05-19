import { useCallback, useEffect, useMemo, useState } from 'react'

import {
	buildEntitySelectionSnapshot,
	mergeEntitySelectionRange,
	moveEntitySelectionFocus,
	pruneEntitySelectionFocusState,
	selectEntityRange,
	toggleEntitySelectionByVisibleOrder,
	type EntitySelectionState,
} from './entitySelection'

export function useEntitySelection(entityIds: string[]) {
	const [selectionState, setSelectionState] = useState<EntitySelectionState>(() => ({
		selectedIds: [],
		focusedId: null,
		selectionAnchorId: null,
	}))
	const entityIdSignature = entityIds.join('\u0000')

	useEffect(() => {
		setSelectionState((currentState) => {
			const nextState = pruneEntitySelectionFocusState(currentState, entityIds)
			if (
				nextState.selectedIds.length === currentState.selectedIds.length &&
				nextState.selectedIds.every(
					(entityId, index) => entityId === currentState.selectedIds[index],
				) &&
				nextState.focusedId === currentState.focusedId &&
				nextState.selectionAnchorId === currentState.selectionAnchorId
			) {
				return currentState
			}

			return nextState
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [entityIdSignature])

	const { selectedIds, focusedId, selectionAnchorId } = selectionState
	const selectedIdSet = useMemo(() => new Set(selectedIds), [selectedIds])
	const selectionSnapshot = useMemo(() => buildEntitySelectionSnapshot(selectedIds), [selectedIds])
	const selectedCount = selectedIds.length
	const focusedIndex = focusedId ? entityIds.indexOf(focusedId) : -1

	const toggleSelection = useCallback(
		(entityId: string) => {
			setSelectionState((currentState) => ({
				selectedIds: toggleEntitySelectionByVisibleOrder(
					entityIds,
					currentState.selectedIds,
					entityId,
				),
				focusedId: entityId,
				selectionAnchorId: entityId,
			}))
		},
		[entityIds],
	)

	const clearSelection = useCallback(() => {
		setSelectionState((currentState) =>
			currentState.selectedIds.length === 0
				? currentState
				: {
						...currentState,
						selectedIds: [],
					},
		)
	}, [])

	const selectIds = useCallback((nextSelectedIds: string[]) => {
		setSelectionState((currentState) => {
			if (nextSelectedIds.length === 0) {
				return currentState.selectedIds.length === 0 &&
					currentState.focusedId === null &&
					currentState.selectionAnchorId === null
					? currentState
					: {
							selectedIds: [],
							focusedId: null,
							selectionAnchorId: null,
						}
			}

			const currentFocusedId =
				currentState.focusedId && nextSelectedIds.includes(currentState.focusedId)
					? currentState.focusedId
					: null
			const currentAnchorId =
				currentState.selectionAnchorId &&
				nextSelectedIds.includes(currentState.selectionAnchorId)
					? currentState.selectionAnchorId
					: null
			const nextFocusedId = currentFocusedId ?? nextSelectedIds[0] ?? null
			const nextAnchorId = currentAnchorId ?? nextFocusedId
			const hasSameSelection =
				currentState.selectedIds.length === nextSelectedIds.length &&
				currentState.selectedIds.every(
					(entityId, index) => entityId === nextSelectedIds[index],
				)

			if (
				hasSameSelection &&
				currentState.focusedId === nextFocusedId &&
				currentState.selectionAnchorId === nextAnchorId
			) {
				return currentState
			}

			return {
				selectedIds: [...nextSelectedIds],
				focusedId: nextFocusedId,
				selectionAnchorId: nextAnchorId,
			}
		})
	}, [])

	const selectAll = useCallback(() => {
		selectIds(entityIds)
	}, [entityIds, selectIds])

	const setFocusedId = useCallback((entityId: string | null) => {
		setSelectionState((currentState) => ({
			...currentState,
			focusedId: entityId,
			selectionAnchorId: entityId
				? (currentState.selectionAnchorId ?? entityId)
				: currentState.selectionAnchorId,
		}))
	}, [])

	const moveFocus = useCallback(
		(
			delta: number,
			options: {
				preserveAnchor?: boolean
				selectRange?: boolean
				startFromId?: string | null
				resetAnchorToStart?: boolean
			} = {},
		) => {
			let nextFocusedId: string | null = null
			setSelectionState((currentState) => {
				const startFocusedId =
					options.startFromId && entityIds.includes(options.startFromId)
						? options.startFromId
						: currentState.focusedId
				if (options.selectRange && options.resetAnchorToStart && startFocusedId) {
					nextFocusedId = startFocusedId
					return {
						selectedIds: toggleEntitySelectionByVisibleOrder(
							entityIds,
							currentState.selectedIds,
							startFocusedId,
						),
						focusedId: startFocusedId,
						selectionAnchorId: startFocusedId,
					}
				}

				nextFocusedId = moveEntitySelectionFocus(entityIds, startFocusedId, delta)
				const nextAnchorId = options.preserveAnchor
					? (currentState.selectionAnchorId ?? startFocusedId ?? nextFocusedId)
					: nextFocusedId
				return {
					selectedIds: options.selectRange
						? nextFocusedId
							? toggleEntitySelectionByVisibleOrder(
									entityIds,
									currentState.selectedIds,
									nextFocusedId,
								)
							: currentState.selectedIds
						: currentState.selectedIds,
					focusedId: nextFocusedId,
					selectionAnchorId: nextAnchorId,
				}
			})
			return nextFocusedId
		},
		[entityIds],
	)

	const rangeSelectTo = useCallback(
		(entityId: string) => {
			setSelectionState((currentState) => {
				const anchorId =
					currentState.selectionAnchorId && entityIds.includes(currentState.selectionAnchorId)
						? currentState.selectionAnchorId
						: currentState.focusedId && entityIds.includes(currentState.focusedId)
							? currentState.focusedId
							: entityId
				return {
					selectedIds: mergeEntitySelectionRange(
						entityIds,
						currentState.selectedIds,
						selectEntityRange(entityIds, anchorId, entityId),
					),
					focusedId: entityId,
					selectionAnchorId: anchorId,
				}
			})
		},
		[entityIds],
	)

	const selectOnly = useCallback((entityId: string) => {
		setSelectionState({
			selectedIds: [entityId],
			focusedId: entityId,
			selectionAnchorId: entityId,
		})
	}, [])

	return {
		selectedIds,
		selectedIdSet,
		selectionSnapshot,
		selectedCount,
		focusedId,
		focusedIndex,
		selectionAnchorId,
		setFocusedId,
		moveFocus,
		rangeSelectTo,
		selectOnly,
		toggleSelection,
		clearSelection,
		selectIds,
		selectAll,
	}
}
