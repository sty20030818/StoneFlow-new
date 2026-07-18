import { startTransition, useEffect, useRef } from 'react'

import type { LauncherAction } from '@/features/launcher/domain/launcherDomainTypes'
import { SEARCH_RESULT_LIMIT } from '@/features/launcher/domain/useLauncherDerivedState'
import type { LauncherSearchResponse } from '@/features/launcher/model/types'

const SEARCH_DEBOUNCE_MS = 120

type UseLauncherSearchEffectArgs = {
	dispatch: React.ActionDispatch<[action: LauncherAction]>
	query: string
	searchFn: (query: string, limit: number) => Promise<LauncherSearchResponse>
}

export function useLauncherSearchEffect({
	dispatch,
	query,
	searchFn,
}: UseLauncherSearchEffectArgs) {
	const searchRequestIdRef = useRef(0)

	useEffect(() => {
		const normalizedQuery = query.trim()
		if (!normalizedQuery) {
			dispatch({ type: 'searchCleared' })
			return
		}

		const requestId = ++searchRequestIdRef.current
		dispatch({ type: 'searchStarted' })

		const timerId = window.setTimeout(() => {
			void searchFn(normalizedQuery, SEARCH_RESULT_LIMIT)
				.then((payload) => {
					if (requestId !== searchRequestIdRef.current) {
						return
					}

					startTransition(() => {
						dispatch({ type: 'searchSucceeded', payload })
					})
				})
				.catch((error) => {
					if (requestId !== searchRequestIdRef.current) {
						return
					}

					const message = error instanceof Error ? error.message : '搜索失败'
					console.warn('[launcher] search failed:', message)

					dispatch({
						type: 'searchFailed',
						message,
					})
				})
		}, SEARCH_DEBOUNCE_MS)

		return () => {
			window.clearTimeout(timerId)
		}
	}, [dispatch, query, searchFn])
}
