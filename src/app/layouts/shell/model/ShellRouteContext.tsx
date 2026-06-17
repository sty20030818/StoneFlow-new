import { createContext, useContext, type ReactNode } from 'react'

import { useShellRoute, type ShellRoute } from '@/app/routing'

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

/**
 * 优先读取壳层提供的 shellRoute；旧测试或 legacy 入口下回退到 parser hook。
 */
export function useCurrentShellRoute() {
	return useContext(ShellRouteContext) ?? useShellRoute()
}
