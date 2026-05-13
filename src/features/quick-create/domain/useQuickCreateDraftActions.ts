import { useCallback } from 'react'

import type { QuickCreateAction } from '@/features/quick-create/model/quickCreateReducer'
import type {
	QuickCreateFocusTarget,
	QuickCreatePlacement,
	QuickCreatePopoverKey,
	QuickCreatePriority,
	QuickCreateStatus,
} from '@/features/quick-create/model/types'

type UseQuickCreateDraftActionsArgs = {
	dispatch: React.ActionDispatch<[action: QuickCreateAction]>
	focusInput: () => void
	focusTarget: QuickCreateFocusTarget
	flatItemCount: number
	hasTitle: boolean
	loadProjectsForSpace: (spaceId: string) => Promise<void>
}

export function useQuickCreateDraftActions({
	dispatch,
	focusInput,
	focusTarget,
	flatItemCount,
	hasTitle,
	loadProjectsForSpace,
}: UseQuickCreateDraftActionsArgs) {
	const setTitle = useCallback((title: string) => {
		dispatch({ type: 'titleChanged', title })
	}, [dispatch])

	const setPriority = useCallback(
		(priority: QuickCreatePriority) => {
			dispatch({ type: 'priorityChanged', priority })
			focusInput()
		},
		[dispatch, focusInput],
	)

	const setStatus = useCallback(
		(status: QuickCreateStatus) => {
			dispatch({ type: 'statusChanged', status })
			focusInput()
		},
		[dispatch, focusInput],
	)

	const setPopover = useCallback((key: QuickCreatePopoverKey | null) => {
		dispatch({ type: 'activePopoverChanged', key })
	}, [dispatch])

	const selectPlacement = useCallback(
		(placement: QuickCreatePlacement) => {
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
		(field: 'dueAt' | 'scheduledAt' | 'reminderAt', value: string | null) => {
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

	const setProjectSearch = useCallback((query: string) => {
		dispatch({ type: 'projectSearchChanged', query })
	}, [dispatch])

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

	const focusResult = useCallback((index: number) => {
		dispatch({ type: 'focusChanged', focusTarget: { kind: 'result', index } })
	}, [dispatch])

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
