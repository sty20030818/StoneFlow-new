import { createFileRoute } from '@tanstack/react-router'

import { NoProjectPage } from '@/features/no-project/ui/NoProjectPage'

export const Route = createFileRoute('/_shell/all/no-project')({
	component: NoProjectPage,
})
