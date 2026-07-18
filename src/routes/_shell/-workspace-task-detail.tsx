/**
 * 任务详情叶子页。
 */
import type { QueryClient } from '@tanstack/react-query'

import {
	createTaskLoaderError,
	DetailRouteErrorStateView,
	ensureTaskDetailRouteData,
	ensureVisibleSpaces,
} from './-detail-route-helpers'
import { useVisibleSpacesQuery } from '@/features/space'
import { TaskPage } from '@/features/task'
import type { Scope } from '@/shared/types'

export async function loadTaskDetail(input: {
	queryClient: QueryClient
	taskId: string
	routeScopeKey: string
}) {
	const spaces = await ensureVisibleSpaces(input.queryClient)
	const routeSpaceId = input.routeScopeKey === 'all' ? '' : input.routeScopeKey
	return ensureTaskDetailRouteData({
		queryClient: input.queryClient,
		taskId: input.taskId,
		routeSpaceId,
		spaces,
	})
}

export function WorkspaceTaskDetailPage({ scope, taskId }: { scope: Scope; taskId: string }) {
	useVisibleSpacesQuery()
	return <TaskPage scope={scope} taskId={taskId} />
}

export function WorkspaceTaskDetailError({ error }: { error: unknown }) {
	return <DetailRouteErrorStateView error={error} fallback={createTaskLoaderError} />
}
