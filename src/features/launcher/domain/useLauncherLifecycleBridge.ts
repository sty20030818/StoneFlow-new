import { startTransition, useEffect, useLayoutEffect, useRef } from 'react'

import type { LauncherRecentData } from '../model/types'
import type { LauncherOpenSessionResponse } from '../api/launcherApi'
import type { LauncherAction } from './launcherDomainTypes'

type UseLauncherLifecycleBridgeArgs = {
	dispatch: React.ActionDispatch<[action: LauncherAction]>
	fetchRecent: () => Promise<LauncherRecentData>
	focusInput: () => void
	nextOpenContext: LauncherOpenSessionResponse | null
	shouldFocusInput: boolean
	onRefreshRecentError: (error: unknown) => void
}

export function useLauncherLifecycleBridge({
	dispatch,
	fetchRecent,
	focusInput,
	nextOpenContext,
	onRefreshRecentError,
	shouldFocusInput,
}: UseLauncherLifecycleBridgeArgs) {
	const refreshRecentRef = useRef<() => void>(() => {})

	useLayoutEffect(() => {
		refreshRecentRef.current = () => {
			dispatch({ type: 'recentDataLoading' })
			void fetchRecent()
				.then((recentData) => {
					startTransition(() => {
						dispatch({
							type: 'recentDataLoaded',
							payload: recentData,
						})
					})
				})
				.catch((error) => {
					onRefreshRecentError(error)
					dispatch({ type: 'recentDataFailed' })
				})
		}
	}, [dispatch, fetchRecent, onRefreshRecentError])

	useLayoutEffect(() => {
		if (!nextOpenContext) {
			return
		}

		dispatch({ type: 'sessionOpened', payload: nextOpenContext })
		refreshRecentRef.current()
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
