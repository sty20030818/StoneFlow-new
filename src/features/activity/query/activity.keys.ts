import type { GetEntityActivitiesRequest } from '@/features/activity/api/getEntityActivities'

export const activityKeys = {
	all: ['activity'] as const,
	disabledEntity: () => [...activityKeys.all, 'entity', 'disabled'] as const,
	entity: (input: GetEntityActivitiesRequest) => [...activityKeys.all, 'entity', input] as const,
}
