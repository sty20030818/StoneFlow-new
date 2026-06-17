import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/spaces/$spaceId/tasks')({
	component: SpaceTasksRoute,
})

function SpaceTasksRoute() {
	return <Outlet />
}
