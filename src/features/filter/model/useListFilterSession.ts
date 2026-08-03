/**
 * 列表筛选会话：base（View 定义）+ URL temp → effective。
 * dirty = temp 非空；Clear = 清 URL temp，恢复 base。
 */
import { useCallback, useMemo } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'

import {
	EMPTY_FILTER_QUERY,
	FILTER_SEARCH_PARAM_KEY,
	filterQueriesEqual,
	isFilterQueryEmpty,
	normalizeFilterQuery,
	decodeFilterQueryFromSearchParam,
	encodeFilterQueryToSearchParam,
	type FilterQuery,
} from '../core'

export type UseListFilterSessionOptions = {
	/** View 定义 filters；非 View 页传 empty */
	base?: FilterQuery | null
}

export type ListFilterSession = {
	base: FilterQuery
	temp: FilterQuery
	/** dirty ? temp : base */
	effective: FilterQuery
	/** URL 上存在临时筛选 */
	dirty: boolean
	isEmpty: boolean
	setTemp: (query: FilterQuery) => void
	/** 清空 URL 临时筛选（恢复 base） */
	clearTemp: () => void
	/** 用 effective 作为新 temp 写入（编辑 chip 时） */
	replaceEffective: (query: FilterQuery) => void
}

export function useListFilterSession(options: UseListFilterSessionOptions = {}): ListFilterSession {
	const base = useMemo(
		() => normalizeFilterQuery(options.base ?? EMPTY_FILTER_QUERY),
		[options.base],
	)
	const navigate = useNavigate()
	const searchStr = useRouterState({ select: (state) => state.location.searchStr })

	const temp = useMemo(() => {
		const params = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr)
		return decodeFilterQueryFromSearchParam(params.get(FILTER_SEARCH_PARAM_KEY))
	}, [searchStr])

	const dirty = !isFilterQueryEmpty(temp)
	const effective = dirty ? temp : base
	const isEmpty = isFilterQueryEmpty(effective)

	const setTemp = useCallback(
		(query: FilterQuery) => {
			const next = normalizeFilterQuery(query)
			const currentEncoded = (() => {
				const params = new URLSearchParams(
					searchStr.startsWith('?') ? searchStr.slice(1) : searchStr,
				)
				return params.get(FILTER_SEARCH_PARAM_KEY)
			})()
			const nextEncoded = encodeFilterQueryToSearchParam(next)
			if ((currentEncoded ?? null) === (nextEncoded ?? null)) {
				return
			}
			if (filterQueriesEqual(next, decodeFilterQueryFromSearchParam(currentEncoded))) {
				return
			}

			void navigate({
				search: ((prev: Record<string, unknown>) => {
					const nextSearch = { ...prev }
					if (nextEncoded == null) {
						delete nextSearch[FILTER_SEARCH_PARAM_KEY]
					} else {
						nextSearch[FILTER_SEARCH_PARAM_KEY] = nextEncoded
					}
					return nextSearch
				}) as never,
				replace: true,
			})
		},
		[navigate, searchStr],
	)

	const clearTemp = useCallback(() => {
		setTemp(EMPTY_FILTER_QUERY)
	}, [setTemp])

	const replaceEffective = useCallback(
		(query: FilterQuery) => {
			setTemp(query)
		},
		[setTemp],
	)

	return {
		base,
		temp,
		effective,
		dirty,
		isEmpty,
		setTemp,
		clearTemp,
		replaceEffective,
	}
}

/** 供路由 validateSearch：只关心 f，其它键透传 */
export function parseListFilterSearch(search: Record<string, unknown>): {
	[FILTER_SEARCH_PARAM_KEY]?: string
} {
	const f = search[FILTER_SEARCH_PARAM_KEY]
	if (typeof f === 'string' && f.length > 0) {
		return { [FILTER_SEARCH_PARAM_KEY]: f }
	}
	return {}
}
