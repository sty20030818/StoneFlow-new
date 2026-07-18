import { startTransition, useEffect, useLayoutEffect, useRef } from 'react'

import type { LauncherInitialState } from '@/features/launcher/model/types'
import type { LauncherOpenSessionResponse } from '@/features/launcher/api/launcherApi'
import type { LauncherAction } from '@/features/launcher/domain/launcherDomainTypes'

type UseLauncherLifecycleBridgeArgs = {
	dispatch: React.ActionDispatch<[action: LauncherAction]>
	fetchSnapshot: () => Promise<LauncherInitialState>
	focusInput: () => void
	nextOpenContext: LauncherOpenSessionResponse | null
	shouldFocusInput: boolean
	onRefreshRecentError: (error: unknown) => void
}

export function useLauncherLifecycleBridge({
	dispatch,
	fetchSnapshot,
	focusInput,
	nextOpenContext,
	onRefreshRecentError,
	shouldFocusInput,
}: UseLauncherLifecycleBridgeArgs) {
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
