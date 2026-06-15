import { startTransition, useEffect, useRef } from 'react'

import type { QuickCreateAction } from '@/features/quick-create/domain/quickCreateDomainReducer'
import type { QuickCreateSearchResponse } from '@/features/quick-create/model/types'

const SEARCH_DEBOUNCE_MS = 120

type UseQuickCreateSearchEffectArgs = {
	dispatch: React.ActionDispatch<[action: QuickCreateAction]>
	query: string
	searchFn: (query: string, limit: number) => Promise<QuickCreateSearchResponse>
}

export function useQuickCreateSearchEffect({
	dispatch,
	query,
	searchFn,
}: UseQuickCreateSearchEffectArgs) {
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
			void searchFn(normalizedQuery, 3)
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
					console.warn('[quick-create] search failed:', message)

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
