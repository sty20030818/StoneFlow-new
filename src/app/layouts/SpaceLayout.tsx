import { useShellRoute } from '@/app/routing'
import { Outlet } from '@/app/routing/tanstackCompat'
import { ShellRouteLayout } from './ShellRouteLayout'

const ALL_SCOPE = { type: 'all' as const }

export function SpaceLayout() {
	const shellRoute = useShellRoute()
	const scope = shellRoute.scope ?? ALL_SCOPE

	return (
		<ShellRouteLayout scope={scope} shellRoute={shellRoute}>
			<Outlet />
		</ShellRouteLayout>
	)
}
