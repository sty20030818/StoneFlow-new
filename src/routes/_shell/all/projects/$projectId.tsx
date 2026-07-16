import { createFileRoute } from '@tanstack/react-router'

import { ProjectPage } from '@/features/project/components/ProjectPage'
import { useVisibleSpacesQuery } from '@/features/space/hooks/space.queries'
import {
	createProjectLoaderError,
	DetailRouteErrorStateView,
	ensureProjectDetailRouteData,
	ensureVisibleSpaces,
} from '../../-detail-route-helpers'

export const Route = createFileRoute('/_shell/all/projects/$projectId')({
	loader: async ({ context, params }) => {
		const spaces = await ensureVisibleSpaces(context.queryClient)

		return ensureProjectDetailRouteData({
			queryClient: context.queryClient,
			projectId: params.projectId,
			routeSpaceId: '',
			spaces,
		})
	},
	errorComponent: AllProjectDetailRouteError,
	component: AllProjectDetailRoute,
})

function AllProjectDetailRoute() {
	const { scope } = Route.useLoaderData()
	useVisibleSpacesQuery()

	return <ProjectPage scopeOverride={scope} />
}

function AllProjectDetailRouteError({ error }: { error: unknown }) {
	return <DetailRouteErrorStateView error={error} fallback={createProjectLoaderError} />
}
