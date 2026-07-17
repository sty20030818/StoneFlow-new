import { createContext, useContext, type ReactNode } from 'react'

import type { ShellRoute } from '@/app/navigation/shellRoute'
import type { ShellSectionKey } from '@/layout/types'
import type { Scope } from '@/shared/types'

/**
 * 壳只读上下文：当前 scope / 路由语义 / 活跃分区。
 * feature 需要 URL 真相时优先用 navigation 解析或本 context，不要反向依赖 layout 组件。
 */
export type ShellContextValue = {
	scope: Scope
	shellRoute: ShellRoute
	/** 当前 spaceId（all scope 时为回退可见 space） */
	currentSpaceId: string | null
	activeSection: ShellSectionKey
}

const ShellContext = createContext<ShellContextValue | null>(null)

export function ShellProvider({
	value,
	children,
}: {
	value: ShellContextValue
	children: ReactNode
}) {
	return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}

export function useShellContext(): ShellContextValue {
	const value = useContext(ShellContext)
	if (!value) {
		throw new Error('useShellContext must be used within ShellProvider')
	}
	return value
}
