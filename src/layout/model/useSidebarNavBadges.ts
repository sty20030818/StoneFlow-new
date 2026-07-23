import { useMemo } from 'react'

import type { Scope } from '@/shared/types'
import { useTaskListQuery } from '@/features/task'

/**
 * 侧栏主导航 / 独立事项 badge 数量。
 */
export function useSidebarNavBadges(currentScope: Scope) {
	const allTasks = useTaskListQuery({
		scope: currentScope,
		viewKey: 'all',
		placement: { kind: 'all' },
	})

	const standaloneTasks = useTaskListQuery({
		scope: currentScope,
		viewKey: 'all',
		placement: { kind: 'standalone' },
		// 独立事项仅 Space 上下文有意义；all scope 下仍查询但侧栏不展示项目列表
	})

	return useMemo(() => {
		const next: Record<string, string | undefined> = {}
		const allCount = allTasks.data?.length ?? 0
		const standaloneCount = standaloneTasks.data?.length ?? 0

		if (allCount > 0) next.tasks = String(allCount)
		if (standaloneCount > 0) next.standalone = String(standaloneCount)

		return next
	}, [allTasks.data, standaloneTasks.data])
}
