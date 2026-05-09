import { invoke } from '@tauri-apps/api/core'

import type { SearchEntitiesResult } from '@/shared/types'

export type SearchEntitiesInput = {
	query: string
	limitPerSection?: number
}

export async function searchEntities(input: SearchEntitiesInput) {
	return invoke<SearchEntitiesResult>('search_entities', {
		input: {
			query: input.query,
			limitPerSection: input.limitPerSection ?? 5,
		},
	})
}
