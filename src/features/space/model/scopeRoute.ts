import { useMemo } from 'react'
import { useLocation, useParams } from 'react-router-dom'

import { parseShellScopePath } from '@/app/routing'
import type { Scope } from '@/shared/types'

/**
 * 从当前路由推导 Scope。
 * 返回的 scope 对象通过 useMemo 稳定引用，可安全用于 useEffect 依赖。
 */
export function useScopeRoute() {
	const { pathname } = useLocation()
	const { spaceId } = useParams()

	const scope: Scope = useMemo(
		() => parseShellScopePath(pathname) ?? (spaceId ? { type: 'space', spaceId } : { type: 'all' }),
		[pathname, spaceId],
	)

	return {
		scope,
		spaceId: scope.type === 'space' ? scope.spaceId : null,
	}
}
