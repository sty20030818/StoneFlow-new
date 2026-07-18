import { createFileRoute } from '@tanstack/react-router'

import { LauncherPage } from '@/features/launcher'

export const Route = createFileRoute('/launcher')({
	component: LauncherPage,
})
