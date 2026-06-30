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

	await Promise.all(
		domains.filter((domain) => !excludedDomains.has(domain)).map((domain) =>
			queryClient.invalidateQueries({ queryKey: [domain] }),
		),
	)
}
