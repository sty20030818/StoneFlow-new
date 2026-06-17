import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/spaces/$spaceId/projects')({
	component: SpaceProjectsRoute,
})

function SpaceProjectsRoute() {
	return <Outlet />
}
