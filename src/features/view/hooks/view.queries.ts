import { infiniteQueryOptions, useInfiniteQuery, useQuery } from '@tanstack/react-query'

import { listViews, runTaskView } from '../api/views'
import type { RunTaskViewInput, RunTaskViewResult, TaskListItem, View } from '@/shared/types'

import { viewKeys } from './view.keys'

const EMPTY_VIEWS: View[] = []

export function useViewsQuery() {
	return useQuery({
		queryKey: viewKeys.list(),
		queryFn: listViews,
		placeholderData: EMPTY_VIEWS,
	})
}

/** View 任务窗口：key 不含 cursor，cursor 走 pageParam */
export function taskViewRunInfiniteQueryOptions(input: RunTaskViewInput) {
	const keyInput: RunTaskViewInput = {
		scope: input.scope,
		viewId: input.viewId,
		viewKey: input.viewKey,
		...(input.filters ? { filters: input.filters } : {}),
		...(input.sort ? { sort: input.sort } : {}),
		...(input.groupBy != null ? { groupBy: input.groupBy } : {}),
	}
	return infiniteQueryOptions({
		queryKey: viewKeys.taskRun(keyInput),
		queryFn: ({ pageParam }) =>
			runTaskView({
				...keyInput,
				cursor: pageParam ?? null,
			}),
		initialPageParam: null as string | null,
		getNextPageParam: (lastPage) => lastPage.nextCursor,
	})
}

export function useTaskViewRunInfiniteQuery(input: RunTaskViewInput | null) {
	return useInfiniteQuery({
		...taskViewRunInfiniteQueryOptions(
			input ?? {
				scope: { type: 'all' },
				viewKey: 'all',
			},
		),
		enabled: Boolean(input),
	})
}

export function flattenTaskViewPages(
	pages: Array<Pick<RunTaskViewResult, 'items'>> | undefined,
): TaskListItem[] {
	if (!pages) {
		return []
	}
	const items: TaskListItem[] = []
	for (const page of pages) {
		items.push(...page.items)
	}
	return items
}
