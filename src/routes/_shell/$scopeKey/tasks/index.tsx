import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceTasksPage } from '../../-workspace-pages'

export const Route = createFileRoute('/_shell/$scopeKey/tasks/')({
	component: WorkspaceTasksPage,
})
