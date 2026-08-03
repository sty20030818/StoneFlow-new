import { createFileRoute } from '@tanstack/react-router'

import { parseListFilterSearch } from '@/features/filter'

import {
	loadProjectDetail,
	WorkspaceProjectDetailError,
	WorkspaceProjectDetailPage,
} from '../../-workspace-project-detail'

export const Route = createFileRoute('/_shell/$scopeKey/projects/$projectId')({
	validateSearch: parseListFilterSearch,
	loader: async ({ context, params }) =>
		loadProjectDetail({
			queryClient: context.queryClient,
			projectId: params.projectId,
			routeScopeKey: params.scopeKey,
		}),
	errorComponent: WorkspaceProjectDetailError,
	component: ProjectDetailRoute,
})

function ProjectDetailRoute() {
	const { scope } = Route.useLoaderData()
	return <WorkspaceProjectDetailPage scope={scope} />
}
