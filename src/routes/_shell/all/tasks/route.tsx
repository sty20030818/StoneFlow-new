import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/all/tasks')({
	component: AllTasksRoute,
})

function AllTasksRoute() {
	return <Outlet />
}
