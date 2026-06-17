import { Navigate, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/spaces/$spaceId/')({
	component: SpaceIndexRedirect,
})

function SpaceIndexRedirect() {
	const { spaceId } = Route.useParams()

	return <Navigate replace params={{ spaceId }} to='/spaces/$spaceId/inbox' />
}
