import { createFileRoute } from '@tanstack/react-router'

import { parseListFilterSearch } from '@/features/filter'

import { WorkspaceTasksPage } from '../../-workspace-task-list'

export const Route = createFileRoute('/_shell/$scopeKey/tasks/')({
	validateSearch: parseListFilterSearch,
	component: WorkspaceTasksPage,
})
