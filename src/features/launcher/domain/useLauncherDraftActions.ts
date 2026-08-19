import { useCallback } from 'react'

import type { LauncherAction } from './launcherDomainTypes'
import type { CollectionInteraction } from '@/features/selection'
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
	hasTitle: boolean
	loadProjectsForSpace: (spaceId: string) => Promise<void>
	requestResultFocus: (key: string) => void
	resultCollection: CollectionInteraction<string>
}

export function useLauncherDraftActions({
	dispatch,
	focusInput,
	focusTarget,
	hasTitle,
	loadProjectsForSpace,
	requestResultFocus,
	resultCollection,
}: UseLauncherDraftActionsArgs) {
	const setTitle = useCallback(
		(title: string) => {
			resultCollection.focusKey(null)
			dispatch({ type: 'titleChanged', title })
		},
		[dispatch, resultCollection],
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

	const moveFocus = useCallback(
		(direction: 1 | -1) => {
			const keys = resultCollection.projection.navigableKeys
			if (keys.length === 0) {
				return
			}

			if (focusTarget === 'create') {
				if (direction < 0) {
					focusInput()
					return
				}
				focusResultKey(keys[0])
				return
			}

			const currentIndex = resultCollection.focusedKey
				? keys.indexOf(resultCollection.focusedKey)
				: -1
			const nextIndex =
				currentIndex < 0 ? (direction > 0 ? 0 : keys.length - 1) : currentIndex + direction
			if (nextIndex < 0) {
				resultCollection.focusKey(null)
				dispatch({ type: 'focusChanged', focusTarget: hasTitle ? 'create' : 'none' })
				focusInput()
				return
			}

			focusResultKey(keys[Math.min(nextIndex, keys.length - 1)])

			function focusResultKey(key: string | undefined) {
				if (!key) return
				dispatch({ type: 'focusChanged', focusTarget: 'none' })
				resultCollection.focusKey(key)
				requestResultFocus(key)
			}
		},
		[dispatch, focusInput, focusTarget, hasTitle, requestResultFocus, resultCollection],
	)

	const focusCreate = useCallback(() => {
		resultCollection.focusKey(null)
		dispatch({ type: 'focusChanged', focusTarget: hasTitle ? 'create' : 'none' })
	}, [dispatch, hasTitle, resultCollection])

	const focusResult = useCallback(
		(key: string) => {
			dispatch({ type: 'focusChanged', focusTarget: 'none' })
			resultCollection.focusKey(key)
		},
		[dispatch, resultCollection],
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
		setStatus,
		setTitle,
		toggleAdvanced,
	}
}
