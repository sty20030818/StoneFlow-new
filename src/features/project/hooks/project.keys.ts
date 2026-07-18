import type { ProjectOverviewViewKey } from '../model/types'
import type { Scope } from '@/shared/types'

export const projectKeys = {
	all: ['projects'] as const,
	overviews: () => [...projectKeys.all, 'overview'] as const,
	overview: (scope: Scope, viewKey: ProjectOverviewViewKey) =>
		[...projectKeys.overviews(), scope, viewKey] as const,
	sidebars: () => [...projectKeys.all, 'sidebar'] as const,
	sidebar: (scope: Scope) => [...projectKeys.sidebars(), scope] as const,
	details: () => [...projectKeys.all, 'detail'] as const,
	detail: (projectId: string) => [...projectKeys.details(), projectId] as const,
}
