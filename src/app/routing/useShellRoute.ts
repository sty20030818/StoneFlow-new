import { useMemo } from 'react'
import { useLocation } from 'react-router-dom'

import { parseShellRoute } from './routeParser'

export function useShellRoute() {
	const location = useLocation()

	return useMemo(
		() =>
			parseShellRoute({
				pathname: location.pathname,
				search: location.search,
				hash: location.hash,
			}),
		[location.hash, location.pathname, location.search],
	)
}
