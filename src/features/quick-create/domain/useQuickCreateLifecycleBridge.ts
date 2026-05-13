import { startTransition, useEffect, useRef } from 'react'
import { flushSync } from 'react-dom'

import type { QuickCreateAction } from '@/features/quick-create/model/quickCreateReducer'
import type { QuickCreateInitialState } from '@/features/quick-create/model/types'

type UseQuickCreateLifecycleBridgeArgs = {
	dispatch: React.ActionDispatch<[action: QuickCreateAction]>
	fetchSnapshot: () => Promise<QuickCreateInitialState>
	focusInput: () => void
	hasInitialState: boolean
	isPresentationPending: boolean
	nextInitialState: QuickCreateInitialState | null
	onRefreshRecentError: (error: unknown) => void
}

export function useQuickCreateLifecycleBridge({
	dispatch,
	fetchSnapshot,
	focusInput,
	hasInitialState,
	isPresentationPending,
	nextInitialState,
	onRefreshRecentError,
}: UseQuickCreateLifecycleBridgeArgs) {
	const refreshRecentRef = useRef<() => void>(() => {})

	refreshRecentRef.current = () => {
		void fetchSnapshot()
			.then((initialState) => {
				startTransition(() => {
					dispatch({ type: 'recentRefreshed', payload: initialState })
				})
			})
			.catch((error) => {
				onRefreshRecentError(error)
			})
	}

	useEffect(() => {
		if (!nextInitialState) {
			return
		}

		if (!hasInitialState) {
			flushSync(() => {
				dispatch({ type: 'bootstrapSucceeded', payload: nextInitialState })
			})
			return
		}

		flushSync(() => {
			dispatch({ type: 'panelShownRefreshed', payload: nextInitialState })
		})
	}, [dispatch, hasInitialState, nextInitialState])

	useEffect(() => {
		if (!isPresentationPending) {
			return
		}

		focusInput()
	}, [focusInput, isPresentationPending])

	return {
		refreshRecent: () => refreshRecentRef.current(),
	}
}
