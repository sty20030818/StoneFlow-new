import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceProjectsIndexPage } from '../../-workspace-project-overview'

export const Route = createFileRoute('/_shell/$scopeKey/projects/')({
	component: WorkspaceProjectsIndexPage,
})
