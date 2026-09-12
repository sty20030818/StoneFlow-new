/**
 * 列表页注入筛选会话 + 保存入口，供 FilterMenu / FilterBar / 按钮消费。
 * 消费组件必须位于 Provider 内，装配缺失时立即失败。
 */
import { createContext, useContext, type PropsWithChildren } from 'react'

import type { ListFilterSession } from './useListFilterSession'

export type FilterProjectOption = {
	id: string
	name: string
}

export type ListFilterUiValue = {
	session: ListFilterSession
	/** 省略表示当前查询 context 已固定归属，不提供 Project 筛选。 */
	projects?: FilterProjectOption[]
	/** 打开保存视图流程；保存业务由 View 持有。 */
	onSave?: () => void
}

const ListFilterUiContext = createContext<ListFilterUiValue | null>(null)

export function ListFilterUiProvider({
	value,
	children,
}: PropsWithChildren<{ value: ListFilterUiValue }>) {
	return <ListFilterUiContext.Provider value={value}>{children}</ListFilterUiContext.Provider>
}

export function useListFilterUi(): ListFilterUiValue {
	const value = useContext(ListFilterUiContext)
	if (!value) {
		throw new Error('useListFilterUi 必须在 ListFilterUiProvider 内使用')
	}
	return value
}
