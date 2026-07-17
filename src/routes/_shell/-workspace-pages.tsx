/**
 * 工作区叶子单源（S1 单树 /:scopeKey/...）。
 */
import { Navigate } from '@tanstack/react-router'
import { ArchiveIcon, Trash2Icon } from 'lucide-react'
import type { QueryClient } from '@tanstack/react-query'

import {
	createProjectLoaderError,
	createTaskLoaderError,
	DetailRouteErrorStateView,
	ensureProjectDetailRouteData,
	ensureTaskDetailRouteData,
	ensureVisibleSpaces,
} from './-detail-route-helpers'
import { LifecycleList } from '@/features/lifecycle'
import { ProjectPage } from '@/features/project'
import { ProjectOverviewPage } from '@/features/project-overview'
import {
	DEFAULT_SETTINGS_SECTION,
	isSettingsSectionKey,
	readLastSettingsSection,
} from '@/features/settings/contract'
import { SettingsPage } from '@/features/settings/page'
import { useVisibleSpacesQuery } from '@/features/space'
import { TaskListSceneView, TaskPage } from '@/features/task'
import { ViewsPage } from '@/features/view'
import type { Scope } from '@/shared/types'

export function WorkspaceInboxPage() {
	return <TaskListSceneView variant='inbox' />
}

export function WorkspaceTasksPage() {
	return <TaskListSceneView variant='all' />
}

export function WorkspaceNoProjectPage() {
	return <TaskListSceneView variant='no-project' />
}

export function WorkspaceArchivePage() {
	return <LifecycleList icon={ArchiveIcon} mode='archive' title='归档' />
}

export function WorkspaceTrashPage() {
	return <LifecycleList icon={Trash2Icon} mode='trash' title='回收站' />
}

export function WorkspaceProjectsIndexPage() {
	return <ProjectOverviewPage />
}

export function WorkspaceViewsIndexPage() {
	return <ViewsPage />
}

export function WorkspaceViewDetailPage() {
	return <ViewsPage />
}

export function WorkspaceScopeIndexRedirect({ scopeKey }: { scopeKey: string }) {
	if (scopeKey === 'all') {
		return <Navigate params={{ scopeKey: 'all' }} replace to='/$scopeKey/tasks' />
	}
	return <Navigate params={{ scopeKey }} replace to='/$scopeKey/inbox' />
}

export function WorkspaceSettingsIndexRedirect({ scopeKey }: { scopeKey: string }) {
	return (
		<Navigate
			params={{ scopeKey, section: readLastSettingsSection() }}
			replace
			to='/$scopeKey/settings/$section'
		/>
	)
}

export function WorkspaceSettingsSectionGuard({
	scopeKey,
	section,
}: {
	scopeKey: string
	section: string
}) {
	if (!isSettingsSectionKey(section)) {
		return (
			<Navigate
				params={{ scopeKey, section: DEFAULT_SETTINGS_SECTION }}
				replace
				to='/$scopeKey/settings/$section'
			/>
		)
	}
	return <SettingsPage />
}

export async function loadProjectDetail(input: {
	queryClient: QueryClient
	projectId: string
	routeScopeKey: string
}) {
	const spaces = await ensureVisibleSpaces(input.queryClient)
	const routeSpaceId = input.routeScopeKey === 'all' ? '' : input.routeScopeKey
	return ensureProjectDetailRouteData({
		queryClient: input.queryClient,
		projectId: input.projectId,
		routeSpaceId,
		spaces,
	})
}

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

export function WorkspaceProjectDetailPage({ scope }: { scope: Scope }) {
	useVisibleSpacesQuery()
	return <ProjectPage scopeOverride={scope} />
}

export function WorkspaceTaskDetailPage({ scope, taskId }: { scope: Scope; taskId: string }) {
	useVisibleSpacesQuery()
	return <TaskPage scope={scope} taskId={taskId} />
}

export function WorkspaceProjectDetailError({ error }: { error: unknown }) {
	return <DetailRouteErrorStateView error={error} fallback={createProjectLoaderError} />
}

export function WorkspaceTaskDetailError({ error }: { error: unknown }) {
	return <DetailRouteErrorStateView error={error} fallback={createTaskLoaderError} />
}
