import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceNoProjectPage } from '../-workspace-task-list'

export const Route = createFileRoute('/_shell/$scopeKey/no-project')({
	component: WorkspaceNoProjectPage,
})
