import { createFileRoute } from '@tanstack/react-router'

import { TaskPage } from '@/features/task'
import { useVisibleSpacesQuery } from '@/features/space'
import {
	createTaskLoaderError,
	DetailRouteErrorStateView,
	ensureTaskDetailRouteData,
	ensureVisibleSpaces,
} from '../../../-detail-route-helpers'

export const Route = createFileRoute('/_shell/spaces/$spaceId/tasks/$taskId')({
	loader: async ({ context, params }) => {
		const spaces = await ensureVisibleSpaces(context.queryClient)

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
	return <DetailRouteErrorStateView error={error} fallback={createTaskLoaderError} />
}
