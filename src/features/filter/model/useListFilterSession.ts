/**
 * 列表筛选会话：base（View 定义）+ URL draft → effective。
 * URL `f` 是否存在与 draft 是否为空分离；draft 是 base 的完整替换。
 */
import { useCallback, useMemo } from 'react'
import { useNavigate } from '@tanstack/react-router'

import { useCurrentRouteSource } from '@/app/navigation'

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
	/** View 定义 filters；null 表示定义尚未就绪，URL draft 保持原样。 */
	base?: FilterQuery | null
}

export type ListFilterSession = {
	base: FilterQuery
	/** 规范化 URL draft；无 draft 时回退 empty，是否偏离 base 由 dirty 表达 */
	temp: FilterQuery
	/** dirty ? draft : base */
	effective: FilterQuery
	/** URL 上存在与 base 语义不同的完整 draft */
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
	const { searchStr, isCurrent } = useCurrentRouteSource()

	const currentEncoded = useMemo(() => {
		const params = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr)
		return params.get(FILTER_SEARCH_PARAM_KEY)
	}, [searchStr])
	const draft = useMemo(() => decodeFilterQueryFromSearchParam(currentEncoded), [currentEncoded])
	const temp = draft ?? EMPTY_FILTER_QUERY

	const dirty = draft !== null && !filterQueriesEqual(draft, base)
	const effective = dirty ? draft : base
	const isEmpty = isFilterQueryEmpty(effective)

	const writeDraft = useCallback(
		(encoded: string | null) => {
			if (!isCurrent() || currentEncoded === encoded) return
			void navigate({
				search: ((prev: Record<string, unknown>) => {
					const nextSearch = { ...prev }
					if (encoded == null) {
						delete nextSearch[FILTER_SEARCH_PARAM_KEY]
					} else {
						nextSearch[FILTER_SEARCH_PARAM_KEY] = encoded
					}
					return nextSearch
				}) as never,
				replace: true,
			})
		},
		[currentEncoded, isCurrent, navigate],
	)

	const setTemp = useCallback(
		(query: FilterQuery) => {
			const next = normalizeFilterQuery(query)
			if (filterQueriesEqual(next, base)) {
				writeDraft(null)
				return
			}
			if (draft !== null && filterQueriesEqual(next, draft)) return
			writeDraft(encodeFilterQueryToSearchParam(next))
		},
		[base, draft, writeDraft],
	)

	const clearTemp = useCallback(() => writeDraft(null), [writeDraft])

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

/** 供路由 validateSearch：只解析 f，非法定义交由现有路由错误边界呈现。 */
export function parseListFilterSearch(search: Record<string, unknown>): {
	[FILTER_SEARCH_PARAM_KEY]?: string
} {
	const f = search[FILTER_SEARCH_PARAM_KEY]
	if (f === undefined) return {}
	if (typeof f !== 'string') throw new Error('筛选链接无效，请返回列表重新选择筛选。')
	decodeFilterQueryFromSearchParam(f)
	return { [FILTER_SEARCH_PARAM_KEY]: f }
}
