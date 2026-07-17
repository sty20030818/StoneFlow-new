import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceInboxPage } from '../-workspace-pages'

export const Route = createFileRoute('/_shell/$scopeKey/inbox')({
	component: WorkspaceInboxPage,
})
