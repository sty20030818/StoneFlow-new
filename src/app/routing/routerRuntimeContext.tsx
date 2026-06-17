import { createContext, useContext, type ReactNode } from 'react'

import type { router } from '@/app/router'

type AppRouterRuntime = typeof router

const RouterRuntimeContext = createContext<AppRouterRuntime | null>(null)

export function RouterRuntimeProvider({
	children,
	router,
}: {
	children: ReactNode
	router: AppRouterRuntime
}) {
	return <RouterRuntimeContext.Provider value={router}>{children}</RouterRuntimeContext.Provider>
}

export function useRouterRuntime() {
	return useContext(RouterRuntimeContext)
}
