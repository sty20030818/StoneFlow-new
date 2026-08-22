import { createFileRoute } from '@tanstack/react-router'

import { parseTaskWorkspaceSearch } from '@/features/task-workspace'

import { WorkspaceStandalonePage } from '../-workspace-task-list'

export const Route = createFileRoute('/_shell/$scopeKey/standalone')({
	validateSearch: parseTaskWorkspaceSearch,
	component: WorkspaceStandalonePage,
})
