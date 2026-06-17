import { createFileRoute } from '@tanstack/react-router'

import { ScopedShellRouteLayout } from '../../-scoped-shell-route-layout'

export const Route = createFileRoute('/_shell/spaces/$spaceId')({
	component: SpaceScopeRoute,
})

function SpaceScopeRoute() {
	const { spaceId } = Route.useParams()

	return <ScopedShellRouteLayout scope={{ type: 'space', spaceId }} />
}
