import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/all/settings')({
	component: AllSettingsRoute,
})

function AllSettingsRoute() {
	return <Outlet />
}
