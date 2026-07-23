import { useQuery } from '@tanstack/react-query'

import { listViews, runTaskView } from '../api/views'
import type { RunTaskViewInput, View } from '@/shared/types'

import { viewKeys } from './view.keys'

const EMPTY_VIEWS: View[] = []

export function useViewsQuery() {
	return useQuery({
		queryKey: viewKeys.list(),
		queryFn: listViews,
		placeholderData: EMPTY_VIEWS,
	})
}

export function useTaskViewRunQuery(input: RunTaskViewInput | null) {
	return useQuery({
		queryKey: input ? viewKeys.taskRun(input) : viewKeys.disabledTaskRun(),
		queryFn: () => runTaskView(input as RunTaskViewInput),
		enabled: Boolean(input),
	})
}
