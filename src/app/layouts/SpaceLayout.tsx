import { Outlet } from '@tanstack/react-router'
import { ShellRouteLayout } from './ShellRouteLayout'
import { useCurrentShellRoute } from './shell/model/ShellRouteContext'

export function SpaceLayout() {
	const shellRoute = useCurrentShellRoute()
	const scope = shellRoute.scope ?? { type: 'all' as const }

	return (
		<ShellRouteLayout scope={scope} shellRoute={shellRoute}>
			<Outlet />
		</ShellRouteLayout>
	)
}
