import { keepPreviousData, useQuery } from '@tanstack/react-query'

import {
	searchEntities,
	type SearchEntitiesInput,
} from '@/features/global-search/api/searchEntities'

import { searchKeys } from './search.keys'

export function useSearchEntitiesQuery(input: SearchEntitiesInput | null) {
	return useQuery({
		queryKey: input ? searchKeys.query(input) : searchKeys.query({ query: '' }),
		queryFn: () => searchEntities(input ?? { query: '' }),
		enabled: Boolean(input?.query.trim()),
		placeholderData: keepPreviousData,
	})
}
