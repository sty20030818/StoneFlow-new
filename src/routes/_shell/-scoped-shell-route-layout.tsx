import { Outlet, useLocation, useParams } from '@tanstack/react-router'
import { useMemo } from 'react'

import { shellRouteFromMatch } from '@/app/navigation'
import { ShellRouteLayout } from '@/layout/ShellRouteLayout'
import type { Scope } from '@/shared/types'

type ScopedShellRouteLayoutProps = {
	scope: Scope
}

/**
 * 工作区壳：scope 来自 $scopeKey layout；ShellRoute 由 match 投影。
 */
export function ScopedShellRouteLayout({ scope }: ScopedShellRouteLayoutProps) {
	const location = useLocation()
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
