import { createFileRoute } from '@tanstack/react-router'

import { SpaceLayout } from '@/app/layouts/SpaceLayout'

export const Route = createFileRoute('/spaces/$spaceId')({
	component: SpaceRouteComponent,
})

function SpaceRouteComponent() {
	return <SpaceLayout />
}
