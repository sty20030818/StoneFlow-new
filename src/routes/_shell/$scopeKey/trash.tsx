import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceTrashPage } from '../-workspace-lifecycle'

export const Route = createFileRoute('/_shell/$scopeKey/trash')({
	component: WorkspaceTrashPage,
})
