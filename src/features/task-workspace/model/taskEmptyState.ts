import { emitFilterUiEvent } from '@/features/filter'
import type { RunTaskQueryInput } from '@/shared/types'

export const TASK_VIEW_EMPTY_STATE = {
	emptyTitle: '当前视图无匹配任务',
	emptyDescription: '可以调整筛选条件，或切换到其他视图。',
	emptyActionLabel: '调整筛选',
	onEmptyAction: () => emitFilterUiEvent({ type: 'open-menu' }),
}

export function getDefaultTaskEmptyState({
	query,
	totalCount,
	onCreateTask,
}: {
	query: RunTaskQueryInput
	totalCount: number | null | undefined
	onCreateTask: () => void
}) {
	// 只有完整上下文的精确零计数能证明“没有任务”；其他查询只证明当前条件无匹配。
	if (query.baseViewKey !== 'all' || query.filters.clauses.length > 0 || totalCount !== 0) {
		return TASK_VIEW_EMPTY_STATE
	}
	const context = query.context.kind
	return {
		emptyTitle:
			context === 'project'
				? '当前项目没有任务'
				: context === 'standalone'
					? '当前没有独立事项'
					: '当前没有任务',
		emptyDescription:
			context === 'project'
				? '创建任务，开始整理这个项目。'
				: context === 'standalone'
					? '创建一项独立事项，之后可以归入项目。'
					: '创建任务，记下接下来要做的事。',
		emptyActionLabel: '创建任务',
		onEmptyAction: onCreateTask,
	}
}
