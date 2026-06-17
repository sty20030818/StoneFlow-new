import { createHashHistory, createRouter } from '@tanstack/react-router'
import type { QueryClient } from '@tanstack/react-query'

import { routeTree } from '@/routeTree.gen'

export type AppRouterContext = {
	queryClient: QueryClient
}

export const router = createRouter({
	routeTree,
	history: createHashHistory(),
	context: {
		queryClient: undefined as never,
	},
	defaultPreload: 'intent',
	defaultPreloadStaleTime: 0,
	scrollRestoration: true,
	defaultStructuralSharing: true,
})

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}
