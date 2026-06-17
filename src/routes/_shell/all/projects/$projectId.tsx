import { createFileRoute } from '@tanstack/react-router'

import { useNavigate } from '@/app/routing/tanstackCompat'
import { ProjectPage } from '@/features/project/ui/ProjectPage'
import { useVisibleSpacesQuery } from '@/features/space/query/space.queries'
import { TaskPageState } from '@/features/task/detail/ui/TaskPageState'
import {
	createProjectLoaderError,
	ensureProjectDetailRouteData,
	type DetailRouteErrorState,
} from '../../-detail-route-helpers'

export const Route = createFileRoute('/_shell/all/projects/$projectId')({
	loader: async ({ context, params }) => {
		const spaces = await context.queryClient.ensureQueryData({
			queryKey: ['spaces', 'visible'],
			queryFn: async () => (await import('@/features/space/api/spaces')).listVisibleSpaces(),
		})

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
	const detailError = isDetailRouteError(error) ? error : createProjectLoaderError(error)
	const navigate = useNavigate()
	const actionTo = detailError.actionTo

	return (
		<TaskPageState
			actionLabel={detailError.actionLabel}
			description={detailError.description}
			onAction={actionTo ? () => navigate(actionTo, { replace: true }) : undefined}
			pageTitle={detailError.pageTitle}
			title={detailError.title}
		/>
	)
}

function isDetailRouteError(error: unknown): error is DetailRouteErrorState {
	return Boolean(
		error &&
		typeof error === 'object' &&
		'title' in error &&
		'description' in error &&
		'pageTitle' in error,
	)
}
