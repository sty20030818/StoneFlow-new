import { Outlet, useParams, type ParsedLocation } from '@tanstack/react-router'
import { useMemo } from 'react'

import { shellRouteFromMatch } from '@/app/navigation'
import { ShellRouteLayout } from '@/layout/ShellRouteLayout'
import type { Scope } from '@/shared/types'

type ScopedShellRouteLayoutProps = {
	scope: Scope
	location: ParsedLocation
}

/**
 * scope 和 location 来自已提交的 route context，与 params 同步切换。
 * 直接读取 useLocation 会在新页面就绪前把旧页面的面包屑切走。
 */
export function ScopedShellRouteLayout({ scope, location }: ScopedShellRouteLayoutProps) {
	const params = useParams({ strict: false })
	const shellRoute = useMemo(
		() =>
			shellRouteFromMatch({
				scope,
				pathname: location.pathname,
				search: location.searchStr ?? '',
				hash: location.hash ? `#${location.hash}` : '',
				params: {
					scopeKey: typeof params.scopeKey === 'string' ? params.scopeKey : undefined,
					taskId: typeof params.taskId === 'string' ? params.taskId : undefined,
					projectId: typeof params.projectId === 'string' ? params.projectId : undefined,
					viewId: typeof params.viewId === 'string' ? params.viewId : undefined,
					section: typeof params.section === 'string' ? params.section : undefined,
				},
			}),
		[
			location.hash,
			location.pathname,
			location.searchStr,
			params.projectId,
			params.scopeKey,
			params.section,
			params.taskId,
			params.viewId,
			scope,
		],
	)

	return (
		<ShellRouteLayout scope={scope} shellRoute={shellRoute}>
			<Outlet />
		</ShellRouteLayout>
	)
}
