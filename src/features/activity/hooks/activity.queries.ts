import { useQuery } from '@tanstack/react-query'

import { getEntityActivities, type GetEntityActivitiesRequest } from '../api/getEntityActivities'

import { activityKeys } from './activity.keys'

export function useEntityActivitiesQuery(input: GetEntityActivitiesRequest | null) {
	return useQuery({
		queryKey: input ? activityKeys.entity(input) : activityKeys.disabledEntity(),
		queryFn: () => getEntityActivities(input as GetEntityActivitiesRequest),
		enabled: Boolean(input?.entityId),
	})
}
