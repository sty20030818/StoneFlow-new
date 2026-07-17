import { createContext, useContext, type ReactNode } from 'react'

import type { ShellRoute } from './shellLocation'

const ShellRouteContext = createContext<ShellRoute | null>(null)

type ShellRouteProviderProps = {
	shellRoute: ShellRoute
	children: ReactNode
}

/** 壳层注入当前 shellRoute，页面与 feature 通过 useCurrentShellRoute 读取，避免各自解析 location。 */
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
