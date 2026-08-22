import { useTaskQueryCount } from '@/features/task'
import { EMPTY_FILTER_QUERY, type Scope } from '@/shared/types'

/**
 * 侧栏主导航 / 独立事项 badge 数量。
 */
export function useSidebarNavBadges(currentScope: Scope) {
	const allTasks = useTaskQueryCount({
		scope: currentScope,
		context: { kind: 'all' },
		baseViewKey: 'all',
		filters: EMPTY_FILTER_QUERY,
	})

	const standaloneTasks = useTaskQueryCount({
		scope: currentScope,
		context: { kind: 'standalone' },
		baseViewKey: 'all',
		filters: EMPTY_FILTER_QUERY,
		// 独立事项仅 Space 上下文有意义；all scope 下仍查询但侧栏不展示项目列表
	})

	const next: Record<string, string | undefined> = {}
	const allCount = allTasks ?? 0
	const standaloneCount = standaloneTasks ?? 0

	if (allCount > 0) next.tasks = String(allCount)
	if (standaloneCount > 0) next.standalone = String(standaloneCount)

	return next
}
