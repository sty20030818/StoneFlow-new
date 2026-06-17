import { createFileRoute } from '@tanstack/react-router'

import { QuickCreatePage } from '@/features/quick-create/ui/QuickCreatePage'

export const Route = createFileRoute('/quick-create')({
	component: QuickCreatePage,
})
