import { useEffect, useMemo, useState } from 'react'

import { useSearchEntitiesQuery } from '@/features/global-search/hooks'
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
	const [debouncedQuery, setDebouncedQuery] = useState(normalizedQuery)
	if (!normalizedQuery && debouncedQuery) {
		setDebouncedQuery('')
	}
	const searchInput = useMemo(
		() =>
			debouncedQuery
				? {
						query: debouncedQuery,
						limitPerSection: 5,
					}
				: null,
		[debouncedQuery],
	)
	const searchQuery = useSearchEntitiesQuery(searchInput)

	useEffect(() => {
		if (!normalizedQuery) {
			return
		}

		const timerId = window.setTimeout(() => {
			setDebouncedQuery(normalizedQuery)
		}, SEARCH_DEBOUNCE_MS)

		return () => {
			window.clearTimeout(timerId)
		}
	}, [normalizedQuery])

	return {
		result: searchQuery.data ?? emptySearchEntitiesResult(),
		isLoading: Boolean(normalizedQuery) && (searchQuery.isPending || searchQuery.isFetching),
		errorMessage: searchQuery.isError ? '搜索失败，请稍后重试' : null,
		hasResolvedQuery:
			Boolean(normalizedQuery && debouncedQuery) &&
			!searchQuery.isPlaceholderData &&
			!searchQuery.isPending,
	}
}
