import type { SearchEntitiesInput } from '@/features/global-search/api/searchEntities'

export const searchKeys = {
	all: ['global-search'] as const,
	query: (input: SearchEntitiesInput) => [...searchKeys.all, input] as const,
}
