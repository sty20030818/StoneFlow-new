import { createFileRoute } from '@tanstack/react-router'

import { QuickCreatePage } from '@/features/quick-create'

export const Route = createFileRoute('/quick-create')({
	component: QuickCreatePage,
})
