import { useCallback, useEffect, useMemo } from 'react'
import { useNavigate, useRouterState } from '@tanstack/react-router'

import { FILTER_SEARCH_PARAM_KEY } from '@/features/filter'

import type { DefaultTaskView, DefaultTaskViewKey } from './defaultTaskViews'

export const DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY = 'v' as const

export function useDefaultTaskViewSelection(input: {
	options: DefaultTaskView[]
	defaultKey: DefaultTaskViewKey
}) {
	const navigate = useNavigate()
	const searchStr = useRouterState({ select: (state) => state.location.searchStr })
	const requestedKey = useMemo(() => {
		const params = new URLSearchParams(searchStr.startsWith('?') ? searchStr.slice(1) : searchStr)
		return params.get(DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY)
	}, [searchStr])
	const requestedKeyIsValid = input.options.some((option) => option.key === requestedKey)
	const selectedKey = requestedKeyIsValid ? (requestedKey as DefaultTaskViewKey) : input.defaultKey
	const selected = input.options.find((option) => option.key === selectedKey) ?? input.options[0]!

	useEffect(() => {
		if (requestedKey === null || requestedKeyIsValid) return
		void navigate({
			search: ((previous: Record<string, unknown>) => {
				const next = { ...previous }
				delete next[DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY]
				delete next[FILTER_SEARCH_PARAM_KEY]
				return next
			}) as never,
			replace: true,
		})
	}, [navigate, requestedKey, requestedKeyIsValid])

	const select = useCallback(
		(key: string) => {
			if (!input.options.some((option) => option.key === key) || key === selectedKey) return
			return navigate({
				search: ((previous: Record<string, unknown>) => {
					const next = { ...previous }
					delete next[FILTER_SEARCH_PARAM_KEY]
					if (key === input.defaultKey) {
						delete next[DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY]
					} else {
						next[DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY] = key
					}
					return next
				}) as never,
				replace: true,
			})
		},
		[input.defaultKey, input.options, navigate, selectedKey],
	)

	return { selected, selectedKey, select }
}
