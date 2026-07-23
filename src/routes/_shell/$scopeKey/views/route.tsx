import { Outlet, createFileRoute } from '@tanstack/react-router'

import { parseViewSearch } from '@/features/view'

export const Route = createFileRoute('/_shell/$scopeKey/views')({
	validateSearch: parseViewSearch,
	component: () => <Outlet />,
})
