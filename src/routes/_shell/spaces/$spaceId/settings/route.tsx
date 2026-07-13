import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/spaces/$spaceId/settings')({
	component: SpaceSettingsRoute,
})

function SpaceSettingsRoute() {
	return <Outlet />
}
