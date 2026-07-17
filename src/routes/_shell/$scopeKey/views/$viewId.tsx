import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceViewDetailPage } from '../../-workspace-pages'

export const Route = createFileRoute('/_shell/$scopeKey/views/$viewId')({
	component: WorkspaceViewDetailPage,
})
