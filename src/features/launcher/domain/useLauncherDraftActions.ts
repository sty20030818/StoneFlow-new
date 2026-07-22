import { useCallback } from 'react'

import type { LauncherAction } from './launcherDomainTypes'
import type {
	LauncherFocusTarget,
	LauncherPlacement,
	LauncherPopoverKey,
	LauncherPriority,
	LauncherStatus,
} from '../model/types'

type UseLauncherDraftActionsArgs = {
	dispatch: React.ActionDispatch<[action: LauncherAction]>
	focusInput: () => void
	focusTarget: LauncherFocusTarget
	flatItemCount: number
	hasTitle: boolean
	loadProjectsForSpace: (spaceId: string) => Promise<void>
}

export function useLauncherDraftActions({
	dispatch,
	focusInput,
	focusTarget,
	flatItemCount,
	hasTitle,
	loadProjectsForSpace,
}: UseLauncherDraftActionsArgs) {
	const setTitle = useCallback(
		(title: string) => {
			dispatch({ type: 'titleChanged', title })
		},
		[dispatch],
	)

	const setPriority = useCallback(
		(priority: LauncherPriority) => {
			dispatch({ type: 'priorityChanged', priority })
			focusInput()
		},
		[dispatch, focusInput],
	)

	const setStatus = useCallback(
		(status: LauncherStatus) => {
			dispatch({ type: 'statusChanged', status })
			focusInput()
		},
		[dispatch, focusInput],
	)

	const setPopover = useCallback(
		(key: LauncherPopoverKey | null) => {
			dispatch({ type: 'activePopoverChanged', key })
		},
		[dispatch],
	)

	const selectPlacement = useCallback(
		(placement: LauncherPlacement) => {
			dispatch({ type: 'placementChanged', placement })
			dispatch({ type: 'activePopoverClosed' })
			focusInput()
		},
		[dispatch, focusInput],
	)

	const selectSpace = useCallback(
		(spaceId: string) => {
			dispatch({ type: 'spaceChanged', spaceId })
			dispatch({ type: 'activePopoverClosed' })
			void loadProjectsForSpace(spaceId)
			focusInput()
		},
		[dispatch, focusInput, loadProjectsForSpace],
	)

	const setDate = useCallback(
		(field: 'dueAt' | 'plannedAt' | 'remindAt', value: string | null) => {
			dispatch({ type: 'dateChanged', field, value })
			dispatch({ type: 'activePopoverClosed' })
			focusInput()
		},
		[dispatch, focusInput],
	)

	const toggleAdvanced = useCallback(() => {
		dispatch({ type: 'advancedToggled' })
		focusInput()
	}, [dispatch, focusInput])

	const setProjectSearch = useCallback(
		(query: string) => {
			dispatch({ type: 'projectSearchChanged', query })
		},
		[dispatch],
	)

	const moveFocus = useCallback(
		(direction: 1 | -1) => {
			if (flatItemCount === 0) {
				return
			}

			if (focusTarget === 'create') {
				if (direction === 1) {
					dispatch({ type: 'focusChanged', focusTarget: { kind: 'result', index: 0 } })
				}
				return
			}

			if (focusTarget === 'none') {
				dispatch({ type: 'focusChanged', focusTarget: { kind: 'result', index: 0 } })
				return
			}

			const nextIndex = focusTarget.index + direction
			if (nextIndex < 0) {
				dispatch({ type: 'focusChanged', focusTarget: hasTitle ? 'create' : 'none' })
				return
			}

			dispatch({
				type: 'focusChanged',
				focusTarget: { kind: 'result', index: Math.min(nextIndex, flatItemCount - 1) },
			})
		},
		[dispatch, flatItemCount, focusTarget, hasTitle],
	)

	const focusCreate = useCallback(() => {
		dispatch({ type: 'focusChanged', focusTarget: hasTitle ? 'create' : 'none' })
		focusInput()
	}, [dispatch, focusInput, hasTitle])

	const focusResult = useCallback(
		(index: number) => {
			dispatch({ type: 'focusChanged', focusTarget: { kind: 'result', index } })
		},
		[dispatch],
	)

	return {
		focusCreate,
		focusResult,
		moveFocus,
		selectPlacement,
		selectSpace,
		setDate,
		setPopover,
		setPriority,
		setProjectSearch,
		setStatus,
		setTitle,
		toggleAdvanced,
	}
}
