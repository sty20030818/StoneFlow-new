import { redirect, useNavigate } from '@tanstack/react-router'

import {
	openCanonicalProjectDetail,
	openStartupFallback,
	openTaskDetail,
} from '@/app/navigation/intents'
import { listVisibleSpaces } from '@/features/space'
import { projectDetailQueryOptions } from '@/features/project'
import { taskDetailQueryOptions } from '@/features/task'
import type { Scope, Space, TaskDetail } from '@/shared/types'
import type { QueryClient } from '@tanstack/react-query'
import type { ProjectDetail } from '@/features/project'
import { TaskPageState } from '@/features/task'

export type DetailRouteErrorState = {
	title: string
	description: string
	pageTitle: string
	actionLabel?: string
	actionTo?: string
}

export async function ensureVisibleSpaces(queryClient: QueryClient) {
	return queryClient.ensureQueryData({
		queryKey: ['spaces', 'visible'],
		queryFn: listVisibleSpaces,
	})
}

export function resolveVisibleSpaceScope(entitySpaceId: string, spaces: Space[]): Scope | null {
	const hasVisibleSpace = spaces.some((space) => space.id === entitySpaceId)

	if (!hasVisibleSpace) {
		return null
	}

	return { type: 'space', spaceId: entitySpaceId }
}

export async function ensureTaskDetailRouteData(input: {
	queryClient: QueryClient
	taskId: string
	routeSpaceId: string
	spaces: Space[]
}) {
	const task = await input.queryClient.ensureQueryData(taskDetailQueryOptions(input.taskId))
	const scope = resolveVisibleSpaceScope(task.spaceId, input.spaces)

	if (!scope || scope.type !== 'space') {
		throw createTaskUnavailableError()
	}

	if (scope.spaceId !== input.routeSpaceId) {
		throw redirect({
			to: '/$scopeKey/tasks/$taskId',
			params: {
				scopeKey: scope.spaceId,
				taskId: input.taskId,
			},
			replace: true,
		})
	}

	return {
		task,
		scope,
	}
}

export async function ensureProjectDetailRouteData(input: {
	queryClient: QueryClient
	projectId: string
	routeSpaceId: string
	spaces: Space[]
}) {
	const project = await input.queryClient.ensureQueryData(
		projectDetailQueryOptions(input.projectId),
	)
	const scope = resolveVisibleSpaceScope(project.spaceId, input.spaces)

	if (!scope || scope.type !== 'space') {
		throw createProjectUnavailableError()
	}

	if (scope.spaceId !== input.routeSpaceId) {
		throw redirect({
			to: '/$scopeKey/projects/$projectId',
			params: {
				scopeKey: scope.spaceId,
				projectId: input.projectId,
			},
			replace: true,
		})
	}

	return {
		project,
		scope,
	}
}

export function createTaskUnavailableError(): DetailRouteErrorState {
	return {
		title: '任务不可用',
		description: '当前任务所属 Space 不可见，可能已被归档、删除，或当前账号无权访问。',
		pageTitle: '任务详情',
	}
}

export function createProjectUnavailableError(): DetailRouteErrorState {
	return {
		title: '项目不可用',
		description: '当前项目不可见，可能已被归档、删除，或当前账号无权访问。',
		pageTitle: '项目详情',
		actionLabel: '返回工作区',
		actionTo: openStartupFallback(),
	}
}

export function createTaskLoaderError(error: unknown): DetailRouteErrorState {
	return {
		title: '任务不可用',
		description: error instanceof Error ? error.message : '任务详情加载失败',
		pageTitle: '任务详情',
	}
}

export function createProjectLoaderError(error: unknown): DetailRouteErrorState {
	return {
		title: '项目不可用',
		description: error instanceof Error ? error.message : '项目详情加载失败',
		pageTitle: '项目详情',
		actionLabel: '返回工作区',
		actionTo: openStartupFallback(),
	}
}

export function buildTaskDetailFallbackPath(task: TaskDetail) {
	return openTaskDetail(task.id, task.spaceId)
}

export function buildProjectDetailFallbackPath(project: ProjectDetail) {
	return openCanonicalProjectDetail(project.id, project.spaceId)
}

export function isDetailRouteError(error: unknown): error is DetailRouteErrorState {
	return Boolean(
		error &&
		typeof error === 'object' &&
		'title' in error &&
		'description' in error &&
		'pageTitle' in error,
	)
}

export function DetailRouteErrorStateView({
	error,
	fallback,
}: {
	error: unknown
	fallback: (error: unknown) => DetailRouteErrorState
}) {
	const detailError = isDetailRouteError(error) ? error : fallback(error)
	const navigate = useNavigate({ from: '/' })
	const actionTo = detailError.actionTo

	return (
		<TaskPageState
			actionLabel={detailError.actionLabel}
			description={detailError.description}
			onAction={
				actionTo
					? () => {
							void navigate({ to: actionTo as never, replace: true })
						}
					: undefined
			}
			pageTitle={detailError.pageTitle}
			title={detailError.title}
		/>
	)
}
