import { useCallback, useEffect, useMemo, useState } from 'react'

import {
	buildTaskSelectionSnapshot,
	mergeTaskSelectionRange,
	moveTaskSelectionFocus,
	pruneTaskSelectionFocusState,
	selectTaskRange,
	toggleTaskSelectionByVisibleOrder,
} from './taskSelection'

type TaskSelectionState = {
	selectedTaskIds: string[]
	focusedTaskId: string | null
	selectionAnchorId: string | null
}

/**
 * 为任务列表提供最小可用的本地选择状态，并在数据刷新后自动剔除失效项。
 */
export function useTaskSelection(taskIds: string[]) {
	const [selectionState, setSelectionState] = useState<TaskSelectionState>(() => ({
		selectedTaskIds: [],
		focusedTaskId: taskIds[0] ?? null,
		selectionAnchorId: taskIds[0] ?? null,
	}))
	const taskIdSignature = taskIds.join('\u0000')

	useEffect(() => {
		setSelectionState((currentState) => {
			const nextState = pruneTaskSelectionFocusState(
				{
					selectedIds: currentState.selectedTaskIds,
					focusedId: currentState.focusedTaskId,
					anchorId: currentState.selectionAnchorId,
				},
				taskIds,
			)
			const selectedTaskIds = nextState.selectedIds
			if (
				selectedTaskIds.length === currentState.selectedTaskIds.length &&
				selectedTaskIds.every((taskId, index) => taskId === currentState.selectedTaskIds[index]) &&
				nextState.focusedId === currentState.focusedTaskId &&
				nextState.anchorId === currentState.selectionAnchorId
			) {
				return currentState
			}

			return {
				selectedTaskIds,
				focusedTaskId: nextState.focusedId,
				selectionAnchorId: nextState.anchorId,
			}
		})
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [taskIdSignature])

	const { selectedTaskIds, focusedTaskId, selectionAnchorId } = selectionState
	const selectedTaskIdSet = useMemo(() => new Set(selectedTaskIds), [selectedTaskIds])
	const selectionSnapshot = useMemo(
		() => buildTaskSelectionSnapshot(selectedTaskIds),
		[selectedTaskIds],
	)
	const selectedCount = selectedTaskIds.length
	const focusedTaskIndex = focusedTaskId ? taskIds.indexOf(focusedTaskId) : -1

const toggleTaskSelection = useCallback((taskId: string) => {
		setSelectionState((currentState) => ({
			selectedTaskIds: toggleTaskSelectionByVisibleOrder(
				taskIds,
				currentState.selectedTaskIds,
				taskId,
			),
			focusedTaskId: taskId,
			selectionAnchorId: taskId,
		}))
	}, [taskIds])

	const clearTaskSelection = useCallback(() => {
		setSelectionState((currentState) =>
			currentState.selectedTaskIds.length === 0
				? currentState
				: {
						...currentState,
						selectedTaskIds: [],
					},
		)
	}, [])

	const setFocusedTaskId = useCallback((taskId: string | null) => {
		setSelectionState((currentState) => ({
			...currentState,
			focusedTaskId: taskId,
			selectionAnchorId: taskId ? (currentState.selectionAnchorId ?? taskId) : currentState.selectionAnchorId,
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
					options.startFromId && taskIds.includes(options.startFromId)
						? options.startFromId
						: currentState.focusedTaskId
				if (options.selectRange && options.resetAnchorToStart && startFocusedId) {
					nextFocusedId = startFocusedId
					return {
						selectedTaskIds: toggleTaskSelectionByVisibleOrder(
							taskIds,
							currentState.selectedTaskIds,
							startFocusedId,
						),
						focusedTaskId: startFocusedId,
						selectionAnchorId: startFocusedId,
					}
				}

				nextFocusedId = moveTaskSelectionFocus(taskIds, startFocusedId, delta)
				const nextAnchorId = options.preserveAnchor
					? (currentState.selectionAnchorId ?? startFocusedId ?? nextFocusedId)
					: nextFocusedId
				return {
					selectedTaskIds: options.selectRange
						? nextFocusedId
							? toggleTaskSelectionByVisibleOrder(
									taskIds,
									currentState.selectedTaskIds,
									nextFocusedId,
								)
							: currentState.selectedTaskIds
						: currentState.selectedTaskIds,
					focusedTaskId: nextFocusedId,
					selectionAnchorId: nextAnchorId,
				}
			})
			return nextFocusedId
		},
		[taskIds],
	)

	const rangeSelectTo = useCallback(
		(taskId: string) => {
			setSelectionState((currentState) => {
				const anchorId =
					currentState.selectionAnchorId && taskIds.includes(currentState.selectionAnchorId)
						? currentState.selectionAnchorId
						: currentState.focusedTaskId && taskIds.includes(currentState.focusedTaskId)
							? currentState.focusedTaskId
							: taskId
				return {
					selectedTaskIds: mergeTaskSelectionRange(
						taskIds,
						currentState.selectedTaskIds,
						selectTaskRange(taskIds, anchorId, taskId),
					),
					focusedTaskId: taskId,
					selectionAnchorId: anchorId,
				}
			})
		},
		[taskIds],
	)

	const selectOnly = useCallback((taskId: string) => {
		setSelectionState({
			selectedTaskIds: [taskId],
			focusedTaskId: taskId,
			selectionAnchorId: taskId,
		})
	}, [])

	return {
		selectedTaskIds,
		selectedTaskIdSet,
		selectionSnapshot,
		selectedCount,
		focusedTaskId,
		focusedTaskIndex,
		selectionAnchorId,
		setFocusedTaskId,
		moveFocus,
		rangeSelectTo,
		selectOnly,
		toggleTaskSelection,
		clearTaskSelection,
	}
}
