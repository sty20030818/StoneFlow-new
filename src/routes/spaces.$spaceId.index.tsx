import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/spaces/$spaceId/')({
	component: SpaceIndexRedirect,
})

function SpaceIndexRedirect() {
	const { spaceId } = Route.useParams()

	return <Navigate replace params={{ spaceId }} to='/spaces/$spaceId/inbox' />
}
