import { useQuery } from '@tanstack/react-query'

import { listLifecycleEntries } from '../api/lifecycle'
import type { LifecycleEntityType, Scope } from '@/shared/types'

import { lifecycleKeys } from './lifecycle.keys'

export function useLifecycleEntriesQuery(
	mode: 'archive' | 'trash',
	scope: Scope,
	entityFilter?: LifecycleEntityType,
) {
	return useQuery({
		queryKey: lifecycleKeys.list(mode, scope, entityFilter),
		queryFn: () =>
			listLifecycleEntries({
				mode,
				scope,
				entityFilter,
			}),
	})
}
