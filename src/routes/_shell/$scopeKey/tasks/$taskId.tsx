import { createFileRoute } from '@tanstack/react-router'

import {
	loadTaskDetail,
	WorkspaceTaskDetailError,
	WorkspaceTaskDetailPage,
} from '../../-workspace-task-detail'

export const Route = createFileRoute('/_shell/$scopeKey/tasks/$taskId')({
	loader: async ({ context, params }) =>
		loadTaskDetail({
			queryClient: context.queryClient,
			taskId: params.taskId,
			routeScopeKey: params.scopeKey,
		}),
	errorComponent: WorkspaceTaskDetailError,
	component: TaskDetailRoute,
})

function TaskDetailRoute() {
	const { scope } = Route.useLoaderData()
	const { taskId } = Route.useParams()
	return <WorkspaceTaskDetailPage scope={scope} taskId={taskId} />
}
