import { createFileRoute } from '@tanstack/react-router'

import { SpaceLayout } from '@/app/layouts/SpaceLayout'

export const Route = createFileRoute('/all')({
	component: AllRouteComponent,
})

function AllRouteComponent() {
	return <SpaceLayout />
}
