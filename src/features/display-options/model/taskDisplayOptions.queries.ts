import { queryOptions, useQuery } from '@tanstack/react-query'

import { getTaskDisplayPreference } from '@/features/display-options/api/displayOptions'
import { resolveTaskDisplayOptions, type TaskDisplayPageKey } from '@/features/display-options/core'

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

export function resolveTaskDisplayOptionsFromPreferencePayload(input: {
	pageKey: TaskDisplayPageKey
	payload:
		| {
				personal: unknown
				workspaceDefault: unknown
		  }
		| null
		| undefined
}) {
	return resolveTaskDisplayOptions({
		pageKey: input.pageKey,
		workspaceDefault: input.payload?.workspaceDefault ?? null,
		personalOverride: input.payload?.personal ?? null,
	})
}

