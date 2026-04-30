import { useLocation, useParams } from 'react-router-dom'

import type { Scope } from '@/shared/types'

/**
 * 从当前路由推导 Scope。
 */
export function useScopeRoute() {
	const { pathname } = useLocation()
	const { spaceId } = useParams()

	const scope: Scope =
		pathname.startsWith('/spaces') || !spaceId
			? { type: 'all' }
			: {
					type: 'space',
					spaceId,
				}

	return {
		scope,
		spaceId: scope.type === 'space' ? scope.spaceId : null,
	}
}
