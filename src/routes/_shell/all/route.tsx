import { createFileRoute } from '@tanstack/react-router'

import { useRememberCurrentShellRoute } from '@/app/navigation-runtime/useRememberCurrentShellRoute'

import { ScopedShellRouteLayout } from '../-scoped-shell-route-layout'

export const Route = createFileRoute('/_shell/all')({
	component: AllScopeRoute,
})

function AllScopeRoute() {
	const scope = { type: 'all' } as const
	useRememberCurrentShellRoute(scope)

	return <ScopedShellRouteLayout scope={scope} />
}
