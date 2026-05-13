import { startTransition, useEffect, useLayoutEffect, useRef } from 'react'

import type { QuickCreateInitialState } from '@/features/quick-create/model/types'
import type { QuickCreateOpenSessionResponse } from '@/features/quick-create/api/quickCreate'
import type { QuickCreateAction } from '@/features/quick-create/model/quickCreateReducer'

type UseQuickCreateLifecycleBridgeArgs = {
	dispatch: React.ActionDispatch<[action: QuickCreateAction]>
	fetchSnapshot: () => Promise<QuickCreateInitialState>
	focusInput: () => void
	nextOpenContext: QuickCreateOpenSessionResponse | null
	shouldFocusInput: boolean
	onRefreshRecentError: (error: unknown) => void
}

export function useQuickCreateLifecycleBridge({
	dispatch,
	fetchSnapshot,
	focusInput,
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
						type: 'recentDataRefreshed',
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

	useLayoutEffect(() => {
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

		dispatch({ type: 'sessionOpened', payload })
	}, [dispatch, nextOpenContext])

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
