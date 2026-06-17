import { createFileRoute } from '@tanstack/react-router'

import { ViewsPage } from '@/features/views/ui/ViewsPage'

export const Route = createFileRoute('/spaces/$spaceId/views')({
	component: ViewsPage,
})
