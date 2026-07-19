import { queryOptions, useQuery } from '@tanstack/react-query'

import { getTaskDisplayPreference } from '@/features/display-options/api/displayOptions'
import type { TaskDisplayPageKey } from '@/features/display-options/core'

import { taskDisplayOptionsKeys } from './taskDisplayOptions.keys'

export function taskDisplayPreferenceQueryOptions(pageKey: TaskDisplayPageKey) {
	return queryOptions({
		queryKey: taskDisplayOptionsKeys.preference(pageKey),
		queryFn: () => getTaskDisplayPreference(pageKey),
	})
}

export function useTaskDisplayPreferenceQuery(pageKey: TaskDisplayPageKey) {
	return useQuery(taskDisplayPreferenceQueryOptions(pageKey))
}
