import { startTransition, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

import type { QuickCreateInitialState } from '@/features/quick-create/model/types'
import type { QuickCreateOpenSessionResponse } from '@/features/quick-create/api/quickCreate'
import type { QuickCreateAction } from '@/features/quick-create/model/quickCreateReducer'

type UseQuickCreateLifecycleBridgeArgs = {
	dispatch: React.ActionDispatch<[action: QuickCreateAction]>
	fetchSnapshot: () => Promise<QuickCreateInitialState>
	focusInput: () => void
	hasInitialState: boolean
	nextOpenContext: QuickCreateOpenSessionResponse | null
	shouldFocusInput: boolean
	onRefreshRecentError: (error: unknown) => void
}

export function useQuickCreateLifecycleBridge({
	dispatch,
	fetchSnapshot,
	focusInput,
	hasInitialState,
	nextOpenContext,
	onRefreshRecentError,
	shouldFocusInput,
}: UseQuickCreateLifecycleBridgeArgs) {
	const refreshRecentRef = useRef<() => void>(() => {})

	refreshRecentRef.current = () => {
		void fetchSnapshot()
			.then((openContext) => {
				startTransition(() => {
					dispatch({
						type: 'recentRefreshed',
						payload: {
							currentScope: openContext.currentScope,
							defaultSpaceId: openContext.defaultSpaceId,
							defaultPlacement: openContext.defaultPlacement,
							spaces: openContext.spaces,
							projects: openContext.projects,
							recentTasks: openContext.recentTasks,
							recentProjects: openContext.recentProjects,
						},
					})
				})
			})
			.catch((error) => {
				onRefreshRecentError(error)
			})
	}

	useEffect(() => {
		if (!nextOpenContext) {
			return
		}

		const payload = {
			currentScope: nextOpenContext.currentScope,
			defaultSpaceId: nextOpenContext.defaultSpaceId,
			defaultPlacement: nextOpenContext.defaultPlacement,
			spaces: nextOpenContext.spaces,
			projects: nextOpenContext.projects,
			recentTasks: nextOpenContext.recentTasks,
			recentProjects: nextOpenContext.recentProjects,
		}

		if (!hasInitialState) {
			flushSync(() => {
				dispatch({ type: 'bootstrapSucceeded', payload })
			})
			return
		}

		flushSync(() => {
			dispatch({ type: 'panelShownRefreshed', payload })
		})
	}, [dispatch, hasInitialState, nextOpenContext])

	useEffect(() => {
		if (!shouldFocusInput) {
			return
		}

		focusInput()
	}, [focusInput, shouldFocusInput])

	return {
		refreshRecent: () => refreshRecentRef.current(),
	}
}
