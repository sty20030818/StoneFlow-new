/**
 * 将 ListFilterSession 注册为命令宿主可读的页筛选 controller。
 * 只投影清除 Draft 的能力；打开菜单与清除都写回 FilterQuery 真源。
 */
import { useMemo } from 'react'

import { emitFilterUiEvent } from './filterUiEvents'
import type { PageFilterController } from './PageFilterProvider'
import { useRegisterPageFilterController } from './PageFilterProvider'
import type { ListFilterSession } from './useListFilterSession'

export type RegisterFilterCommandAdapterInput = {
	session: ListFilterSession
}

export function useRegisterFilterCommandAdapter(input: RegisterFilterCommandAdapterInput) {
	const { clearTemp, dirty } = input.session

	const controller = useMemo<PageFilterController>(() => {
		return {
			capabilities: {
				supportsClearAll: dirty,
			},
			actions: {
				openFilterMenu: () => {
					emitFilterUiEvent({ type: 'open-menu' })
				},
				clearAll: () => {
					clearTemp()
				},
			},
		}
	}, [clearTemp, dirty])

	useRegisterPageFilterController(controller)
}
