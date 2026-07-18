import type { ProjectOverviewViewKey } from '../model/types'
import type { ProjectOverviewItem, ProjectSidebarItem, Scope } from '@/shared/types'
import type { QueryLoadStatus } from '@/shared/query/queryStatus'

import {
	toProjectOptions,
	useProjectOverviewQuery,
	useProjectSidebarQuery,
} from './project.queries'

const EMPTY_PROJECT_OVERVIEW_ITEMS: ProjectOverviewItem[] = []
const EMPTY_PROJECT_SIDEBAR_ITEMS: ProjectSidebarItem[] = []

export function useProjectOverviewData(scope: Scope, viewKey: ProjectOverviewViewKey) {
	const query = useProjectOverviewQuery(scope, viewKey)
	const status: QueryLoadStatus = query.isError
		? 'error'
		: query.isLoading || query.isPending
			? 'loading'
			: 'ready'

	return {
		items: query.data ?? EMPTY_PROJECT_OVERVIEW_ITEMS,
		status,
		error: query.error instanceof Error ? query.error.message : null,
		refetch: query.refetch,
	}
}

export function useProjectSidebarData(scope: Scope) {
	const query = useProjectSidebarQuery(scope)
	const items = query.data ?? EMPTY_PROJECT_SIDEBAR_ITEMS
	const status: QueryLoadStatus = query.isError
		? 'error'
		: query.isLoading || query.isPending
			? 'loading'
			: 'ready'

	return {
		items,
		options: toProjectOptions(items),
		status,
		error: query.error instanceof Error ? query.error.message : null,
		refetch: query.refetch,
	}
}

export function useProjectOptions(scope: Scope) {
	const query = useProjectSidebarQuery(scope)

	return toProjectOptions(query.data)
}
