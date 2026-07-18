import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceArchivePage } from '../-workspace-lifecycle'

export const Route = createFileRoute('/_shell/$scopeKey/archive')({
	component: WorkspaceArchivePage,
})
