import { createFileRoute } from '@tanstack/react-router'

import { ActivityDebugRoute } from './-activity-debug-route'
import { normalizeActivityDebugSearch } from './-activity-debug-search'

export const Route = createFileRoute('/debug/activity')({
	validateSearch: normalizeActivityDebugSearch,
	component: ActivityDebugRoute,
})
