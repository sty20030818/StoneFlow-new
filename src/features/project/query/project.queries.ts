import { queryOptions, useQuery, useSuspenseQuery } from '@tanstack/react-query'

import {
	getProjectDetail,
	listProjectOverview,
	listSidebarProjects,
} from '@/features/project/api/projects'
import type { ProjectOption, ProjectOverviewViewKey } from '@/features/project/model/types'
import type { Scope } from '@/shared/types'

import { projectKeys } from './project.keys'

export function useProjectOverviewQuery(scope: Scope, viewKey: ProjectOverviewViewKey) {
	return useQuery({
		queryKey: projectKeys.overview(scope, viewKey),
		queryFn: () => listProjectOverview(scope, viewKey),
	})
}

export function useProjectSidebarQuery(scope: Scope) {
	return useQuery({
		queryKey: projectKeys.sidebar(scope),
		queryFn: () => listSidebarProjects(scope),
	})
}

export function useProjectOptionsQuery(scope: Scope) {
	return useProjectSidebarQuery(scope)
}

export function useViewsProjectOptionsQuery(scope: Scope) {
	return useProjectSidebarQuery(scope)
}

export function toProjectOptions(
	projects: Array<{ id: string; spaceId: string; name: string }> | undefined,
): ProjectOption[] {
	return (
		projects?.map((project) => ({
			id: project.id,
			spaceId: project.spaceId,
			name: project.name,
		})) ?? []
	)
}

export function useProjectDetailQuery(projectId: string | null | undefined) {
	return useQuery({
		...(projectId ? projectDetailQueryOptions(projectId) : projectDetailQueryOptions('')),
		enabled: Boolean(projectId),
	})
}

export function projectDetailQueryOptions(projectId: string) {
	return queryOptions({
		queryKey: projectKeys.detail(projectId),
		queryFn: () => getProjectDetail(projectId),
	})
}

export function useSuspenseProjectDetailQuery(projectId: string) {
	return useSuspenseQuery(projectDetailQueryOptions(projectId))
}
