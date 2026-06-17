import { createFileRoute } from '@tanstack/react-router'

import { TrashPage } from '@/features/trash/ui/TrashPage'

export const Route = createFileRoute('/_shell/spaces/$spaceId/trash')({
	component: TrashPage,
})
