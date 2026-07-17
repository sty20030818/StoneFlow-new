import { Outlet, createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_shell/$scopeKey/settings')({
	component: () => <Outlet />,
})
