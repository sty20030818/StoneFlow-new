import { useEffect, useRef, useState } from 'react'

import { searchEntities } from '@/features/global-search/api/searchEntities'
import type { SearchEntitiesResult } from '@/shared/types'

const SEARCH_DEBOUNCE_MS = 150

function emptySearchEntitiesResult(): SearchEntitiesResult {
	return {
		tasks: [],
		projects: [],
		completedTasks: [],
		completedProjects: [],
	}
}

export function useGlobalSearch(query: string) {
	const normalizedQuery = query.trim()
	const requestIdRef = useRef(0)
	const [result, setResult] = useState<SearchEntitiesResult>(emptySearchEntitiesResult)
	const [isLoading, setIsLoading] = useState(false)
	const [errorMessage, setErrorMessage] = useState<string | null>(null)
	const [hasResolvedQuery, setHasResolvedQuery] = useState(false)

	useEffect(() => {
		if (!normalizedQuery) {
			requestIdRef.current += 1
			setResult(emptySearchEntitiesResult())
			setIsLoading(false)
			setErrorMessage(null)
			setHasResolvedQuery(false)
			return
		}

		const requestId = requestIdRef.current + 1
		requestIdRef.current = requestId
		setIsLoading(true)
		setErrorMessage(null)

		const timerId = window.setTimeout(() => {
			void searchEntities({
				query: normalizedQuery,
				limitPerSection: 5,
			})
				.then((nextResult) => {
					if (requestIdRef.current !== requestId) {
						return
					}
					setResult(nextResult)
					setIsLoading(false)
					setHasResolvedQuery(true)
				})
				.catch(() => {
					if (requestIdRef.current !== requestId) {
						return
					}
					setIsLoading(false)
					setErrorMessage('搜索失败，请稍后重试')
					setHasResolvedQuery(true)
				})
		}, SEARCH_DEBOUNCE_MS)

		return () => {
			window.clearTimeout(timerId)
		}
	}, [normalizedQuery])

	return {
		result,
		isLoading,
		errorMessage,
		hasResolvedQuery,
	}
}
