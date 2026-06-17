import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/all/projects')({
	component: AllProjectsRoute,
})

function AllProjectsRoute() {
	return <Outlet />
}
