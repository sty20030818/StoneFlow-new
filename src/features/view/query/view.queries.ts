import { useQuery } from '@tanstack/react-query'

import { listViews, runTaskView } from '@/features/view/api/views'
import type { RunTaskViewInput, View, ViewEntityType } from '@/shared/types'

import { viewKeys } from './view.keys'

const EMPTY_VIEWS: View[] = []

export function useViewsQuery(entityType: ViewEntityType, visibleOnly = false) {
	return useQuery({
		queryKey: viewKeys.list(entityType, visibleOnly),
		queryFn: () => listViews(entityType, visibleOnly),
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
