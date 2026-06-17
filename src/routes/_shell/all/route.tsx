import { createFileRoute } from '@tanstack/react-router'

import { ScopedShellRouteLayout } from '../-scoped-shell-route-layout'

export const Route = createFileRoute('/_shell/all')({
	component: AllScopeRoute,
})

function AllScopeRoute() {
	return <ScopedShellRouteLayout scope={{ type: 'all' }} />
}
