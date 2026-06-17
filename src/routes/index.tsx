import { createFileRoute } from '@tanstack/react-router'

import { RootRestoreRedirect } from '@/app/RootRestoreRedirect'

export const Route = createFileRoute('/')({
	component: RootRestoreRedirect,
})
