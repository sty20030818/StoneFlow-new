import { createFileRoute } from '@tanstack/react-router'

import { ProjectPage } from '@/features/project/ui/ProjectPage'
import { useVisibleSpacesQuery } from '@/features/space/query/space.queries'
import {
	createProjectLoaderError,
	DetailRouteErrorStateView,
	ensureProjectDetailRouteData,
	ensureVisibleSpaces,
} from '../../../-detail-route-helpers'

export const Route = createFileRoute('/_shell/spaces/$spaceId/projects/$projectId')({
	loader: async ({ context, params }) => {
		const spaces = await ensureVisibleSpaces(context.queryClient)

		return ensureProjectDetailRouteData({
			queryClient: context.queryClient,
			projectId: params.projectId,
			routeSpaceId: params.spaceId,
			spaces,
		})
	},
	errorComponent: ProjectDetailRouteError,
	component: SpaceProjectDetailRoute,
})

function SpaceProjectDetailRoute() {
	const { scope } = Route.useLoaderData()
	useVisibleSpacesQuery()

	return <ProjectPage scopeOverride={scope} />
}

function ProjectDetailRouteError({ error }: { error: unknown }) {
	return <DetailRouteErrorStateView error={error} fallback={createProjectLoaderError} />
}
