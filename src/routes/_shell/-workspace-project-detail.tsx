/**
 * 项目详情叶子页。
 */
import type { QueryClient } from '@tanstack/react-query'

import {
	createProjectLoaderError,
	DetailRouteErrorStateView,
	ensureProjectDetailRouteData,
	ensureVisibleSpaces,
} from './-detail-route-helpers'
import { ProjectPage } from '@/features/project'
import { useVisibleSpacesQuery } from '@/features/space'
import type { Scope } from '@/shared/types'

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

export function WorkspaceProjectDetailPage({ scope }: { scope: Scope }) {
	useVisibleSpacesQuery()
	return <ProjectPage scopeOverride={scope} />
}

export function WorkspaceProjectDetailError({ error }: { error: unknown }) {
	return <DetailRouteErrorStateView error={error} fallback={createProjectLoaderError} />
}
