/**
 * 列表页注入筛选会话 + Save/隐藏数，供 FilterMenu / FilterBar / 按钮消费。
 */
import { createContext, useContext, type PropsWithChildren, type ReactNode } from 'react'

import type { ListFilterSession } from './useListFilterSession'

export type FilterProjectOption = {
	id: string
	name: string
}

export type ListFilterUiValue = {
	session: ListFilterSession
	projects?: FilterProjectOption[]
	/** 是否可覆盖当前自定义 View */
	canOverwriteView?: boolean
	/** Save：create 需 name；overwrite 可无 name */
	onSave?: (input: { mode: 'create' | 'overwrite'; name?: string }) => Promise<void>
	/** 被筛选隐藏条数；null/undefined 不展示 */
	hiddenByFilterCount?: number | null
}

const ListFilterUiContext = createContext<ListFilterUiValue | null>(null)

export function ListFilterUiProvider({
	value,
	children,
}: PropsWithChildren<{ value: ListFilterUiValue }>) {
	return <ListFilterUiContext.Provider value={value}>{children}</ListFilterUiContext.Provider>
}

export function useListFilterUi(): ListFilterUiValue | null {
	return useContext(ListFilterUiContext)
}

export function useRequiredListFilterUi(): ListFilterUiValue {
	const value = useContext(ListFilterUiContext)
	if (!value) {
		throw new Error('useRequiredListFilterUi 必须在 ListFilterUiProvider 内使用')
	}
	return value
}

/** 可选：仅渲染 children 当有 session */
export function WhenListFilterUi({ children }: { children: ReactNode }) {
	const value = useListFilterUi()
	if (!value) return null
	return <>{children}</>
}
