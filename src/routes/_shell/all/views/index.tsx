import { createFileRoute } from '@tanstack/react-router'

import { ViewsPage } from '@/features/view'

export const Route = createFileRoute('/_shell/all/views/')({
	component: ViewsPage,
})
