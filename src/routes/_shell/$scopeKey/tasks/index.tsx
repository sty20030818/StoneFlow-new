import { createFileRoute } from '@tanstack/react-router'

import { parseTaskWorkspaceSearch } from '@/features/task-workspace'

import { WorkspaceTasksPage } from '../../-workspace-task-list'

export const Route = createFileRoute('/_shell/$scopeKey/tasks/')({
	validateSearch: parseTaskWorkspaceSearch,
	component: WorkspaceTasksPage,
})
