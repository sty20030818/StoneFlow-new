import { useEffect } from 'react'
import { useLocation } from '@tanstack/react-router'

import { rememberShellRoute } from '@/app/navigation/routeMemoryStore'
import type { Scope } from '@/shared/types'

/**
 * 由 file route 驱动当前 Shell route 写入，避免 Shell UI 壳层承担路由记忆职责。
 * 失败只记录日志，不阻断页面渲染或导航。
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
