import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/all/views')({
	component: AllViewsRoute,
})

function AllViewsRoute() {
	return <Outlet />
}
