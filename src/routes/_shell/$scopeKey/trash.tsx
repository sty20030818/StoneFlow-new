import { createFileRoute } from '@tanstack/react-router'

import { WorkspaceTrashPage } from '../-workspace-pages'

export const Route = createFileRoute('/_shell/$scopeKey/trash')({
	component: WorkspaceTrashPage,
})
