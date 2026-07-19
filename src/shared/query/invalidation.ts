import type { QueryClient } from '@tanstack/react-query'

type WorkspaceQueryDomain = 'tasks' | 'projects' | 'spaces' | 'lifecycle' | 'views' | 'activity'

const WORKSPACE_QUERY_DOMAINS: WorkspaceQueryDomain[] = [
	'tasks',
	'projects',
	'spaces',
	'lifecycle',
	'views',
	'activity',
]

export async function invalidateWorkspaceQueries(
	queryClient: QueryClient,
	options: { exclude?: WorkspaceQueryDomain[]; include?: WorkspaceQueryDomain[] } = {},
) {
	const excludedDomains = new Set(options.exclude ?? [])
	const domains = options.include ?? WORKSPACE_QUERY_DOMAINS

	// 合并 filter + map 为单次遍历
	const invalidations: Array<Promise<void>> = []
	for (const domain of domains) {
		if (!excludedDomains.has(domain)) {
			invalidations.push(queryClient.invalidateQueries({ queryKey: [domain] }))
		}
	}

	await Promise.all(invalidations)
}
