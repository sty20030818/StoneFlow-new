import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceViewsIndexPage } from '../../-workspace-pages'

export const Route = createFileRoute('/_shell/$scopeKey/views/')({
	component: WorkspaceViewsIndexPage,
})
