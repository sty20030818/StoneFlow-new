import { Outlet, createRootRouteWithContext } from '@tanstack/react-router'

import type { AppRouterContext } from '@/app/router'

export const Route = createRootRouteWithContext<AppRouterContext>()({
	component: RootRouteComponent,
})

function RootRouteComponent() {
	return <Outlet />
}
