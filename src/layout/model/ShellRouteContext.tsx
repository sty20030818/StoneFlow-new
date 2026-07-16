import { createContext, useContext, type ReactNode } from 'react'

import type { ShellRoute } from '@/app/navigation/shellRoute'

const ShellRouteContext = createContext<ShellRoute | null>(null)

type ShellRouteProviderProps = {
	shellRoute: ShellRoute
	children: ReactNode
}

/**
 * Phase 4 过渡期统一提供当前 shellRoute，避免页面各自重复解析 location。
 */
export function ShellRouteProvider({ shellRoute, children }: ShellRouteProviderProps) {
	return <ShellRouteContext.Provider value={shellRoute}>{children}</ShellRouteContext.Provider>
}

export function useCurrentShellRoute() {
	const shellRoute = useContext(ShellRouteContext)

	if (!shellRoute) {
		throw new Error('useCurrentShellRoute must be used within ShellRouteProvider')
	}

	return shellRoute
}
