import { createFileRoute } from '@tanstack/react-router'

import { ViewsPage } from '@/features/view/components/ViewsPage'

export const Route = createFileRoute('/_shell/spaces/$spaceId/views/')({
	component: ViewsPage,
})
