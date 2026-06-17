import { createFileRoute } from '@tanstack/react-router'

import { NoProjectPage } from '@/features/no-project/ui/NoProjectPage'

export const Route = createFileRoute('/all/no-project')({
	component: NoProjectPage,
})
