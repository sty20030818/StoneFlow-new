import { createFileRoute } from '@tanstack/react-router'

import { ActivityDebugPage } from '@/features/activity/ui/ActivityDebugPage'

export const Route = createFileRoute('/debug/activity')({
	component: ActivityDebugPage,
})
