import { Outlet, useLocation } from '@tanstack/react-router'
import { useMemo } from 'react'

import { ShellRouteLayout } from '@/app/layouts/ShellRouteLayout'
import { parseShellRoute } from '@/app/routing'
import type { Scope } from '@/shared/types'

type ScopedShellRouteLayoutProps = {
	scope: Scope
}

export function ScopedShellRouteLayout({ scope }: ScopedShellRouteLayoutProps) {
	const location = useLocation()
	const shellRoute = useMemo(
		() =>
			parseShellRoute({
				pathname: location.pathname,
				search: location.searchStr ?? '',
				hash: location.hash ? `#${location.hash}` : '',
			}),
		[location.hash, location.pathname, location.searchStr],
	)

	return (
		<ShellRouteLayout scope={scope} shellRoute={shellRoute}>
			<Outlet />
		</ShellRouteLayout>
	)
}
