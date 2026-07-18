import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceViewDetailPage } from '../../-workspace-views'

export const Route = createFileRoute('/_shell/$scopeKey/views/$viewId')({
	component: WorkspaceViewDetailPage,
})
