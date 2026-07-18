import { useQuery } from '@tanstack/react-query'

import { listVisibleSpaces } from '../api/spaces'

import { spaceKeys } from './space.keys'

export function useVisibleSpacesQuery() {
	return useQuery({
		queryKey: spaceKeys.visible(),
		queryFn: listVisibleSpaces,
	})
}
