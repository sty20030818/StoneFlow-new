import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/spaces/$spaceId/views')({
	component: SpaceViewsRoute,
})

function SpaceViewsRoute() {
	return <Outlet />
}
