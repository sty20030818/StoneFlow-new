import { createFileRoute } from '@tanstack/react-router'

import { useRememberCurrentShellRoute } from '@/app/navigation-runtime/useRememberCurrentShellRoute'

import { ScopedShellRouteLayout } from '../../-scoped-shell-route-layout'

export const Route = createFileRoute('/_shell/spaces/$spaceId')({
	component: SpaceScopeRoute,
})

function SpaceScopeRoute() {
	const { spaceId } = Route.useParams()
	const scope = { type: 'space', spaceId } as const

	useRememberCurrentShellRoute(scope)

	return <ScopedShellRouteLayout scope={scope} />
}
