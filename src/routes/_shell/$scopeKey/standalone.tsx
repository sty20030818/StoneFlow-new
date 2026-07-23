import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceStandalonePage } from '../-workspace-task-list'

export const Route = createFileRoute('/_shell/$scopeKey/standalone')({
	component: WorkspaceStandalonePage,
})
