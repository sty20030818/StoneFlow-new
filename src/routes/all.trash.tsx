import { createFileRoute } from '@tanstack/react-router'

import { TrashPage } from '@/features/trash/ui/TrashPage'

export const Route = createFileRoute('/all/trash')({
	component: TrashPage,
})
