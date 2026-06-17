import { createFileRoute } from '@tanstack/react-router'

import { TaskPage } from '@/features/task/detail/ui/TaskPage'
import { TaskPageState } from '@/features/task/detail/ui/TaskPageState'
import { useVisibleSpacesQuery } from '@/features/space/query/space.queries'
import {
	createTaskLoaderError,
	ensureTaskDetailRouteData,
	type DetailRouteErrorState,
} from '../../../-detail-route-helpers'

export const Route = createFileRoute('/_shell/spaces/$spaceId/tasks/$taskId')({
	loader: async ({ context, params }) => {
		const spaces = await context.queryClient.ensureQueryData({
			queryKey: ['spaces', 'visible'],
			queryFn: async () => (await import('@/features/space/api/spaces')).listVisibleSpaces(),
		})

		return ensureTaskDetailRouteData({
			queryClient: context.queryClient,
			taskId: params.taskId,
			routeSpaceId: params.spaceId,
			spaces,
		})
	},
	errorComponent: TaskDetailRouteError,
	component: SpaceTaskDetailRoute,
})

function SpaceTaskDetailRoute() {
	const { scope } = Route.useLoaderData()
	const { taskId } = Route.useParams()
	useVisibleSpacesQuery()

	return <TaskPage scope={scope} taskId={taskId} />
}

function TaskDetailRouteError({ error }: { error: unknown }) {
	const detailError = isDetailRouteError(error) ? error : createTaskLoaderError(error)

	return (
		<TaskPageState
			description={detailError.description}
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
