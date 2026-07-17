import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/$scopeKey/views')({
	component: () => <Outlet />,
})
