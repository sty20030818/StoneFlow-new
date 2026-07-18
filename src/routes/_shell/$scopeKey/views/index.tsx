import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceViewsIndexPage } from '../../-workspace-views'

export const Route = createFileRoute('/_shell/$scopeKey/views/')({
	component: WorkspaceViewsIndexPage,
})
