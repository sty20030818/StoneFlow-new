import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceArchivePage } from '../-workspace-pages'

export const Route = createFileRoute('/_shell/$scopeKey/archive')({
	component: WorkspaceArchivePage,
})
