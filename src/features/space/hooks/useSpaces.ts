import type { QueryLoadStatus } from '@/shared/query/queryStatus'

import { useVisibleSpacesQuery } from './space.queries'

export function useSpaces() {
	const query = useVisibleSpacesQuery()
	const status: QueryLoadStatus = query.isError
		? 'error'
		: query.isLoading || query.isPending
			? 'loading'
			: 'ready'

	return {
		spaces: query.data ?? [],
		status,
		error: query.error instanceof Error ? query.error.message : null,
		refetch: query.refetch,
	}
}
