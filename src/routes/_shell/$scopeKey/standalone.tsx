import { createFileRoute } from '@tanstack/react-router'

import { parseListFilterSearch } from '@/features/filter'

import { WorkspaceStandalonePage } from '../-workspace-task-list'

export const Route = createFileRoute('/_shell/$scopeKey/standalone')({
	validateSearch: parseListFilterSearch,
	component: WorkspaceStandalonePage,
})
