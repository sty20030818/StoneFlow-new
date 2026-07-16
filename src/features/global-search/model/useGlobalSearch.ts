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
	const [hasResolvedQuery, setHasResolvedQuery] = useState(false)
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
			setDebouncedQuery('')
			setHasResolvedQuery(false)
			return
		}

		const timerId = window.setTimeout(() => {
			setDebouncedQuery(normalizedQuery)
		}, SEARCH_DEBOUNCE_MS)

		return () => {
			window.clearTimeout(timerId)
		}
	}, [normalizedQuery])

	useEffect(() => {
		if (!debouncedQuery) {
			return
		}

		if (!searchQuery.isPending && !searchQuery.isFetching) {
			setHasResolvedQuery(true)
		}
	}, [debouncedQuery, searchQuery.isFetching, searchQuery.isPending])

	return {
		result: searchQuery.data ?? emptySearchEntitiesResult(),
		isLoading: Boolean(normalizedQuery) && (searchQuery.isPending || searchQuery.isFetching),
		errorMessage: searchQuery.isError ? '搜索失败，请稍后重试' : null,
		hasResolvedQuery,
	}
}
