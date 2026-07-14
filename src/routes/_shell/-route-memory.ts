import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'

import { rememberShellRoute } from '@/app/navigation-runtime/routeMemoryStore'
import type { Scope } from '@/shared/types'

/**
 * Phase 5 起由 file route 自己驱动 route memory 写入，避免壳层继续承担路由真相。
 */
export function useRememberCurrentShellRoute(scope: Scope) {
	const location = useLocation()

	useEffect(() => {
		const fullPath = `${location.pathname}${location.searchStr ?? ''}${location.hash ? `#${location.hash}` : ''}`

		void rememberShellRoute(scope, fullPath).catch((error) => {
			console.error('shell route restore save failed', {
				scope,
				path: fullPath,
				error,
			})
		})
	}, [location.hash, location.pathname, location.searchStr, scope])
}
