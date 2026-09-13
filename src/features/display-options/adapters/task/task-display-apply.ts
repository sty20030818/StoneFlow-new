import type { ResolvedTaskDisplayOptions } from '@/features/display-options/core'
import type { TaskQueryGroupSummary, TaskQueryItem } from '@/shared/types'

import { buildTaskDisplaySections } from './task-display-groups'
import type { TaskDisplayApplyResult } from './task-display-types'

type ApplyTaskDisplayOptionsInput = {
	items: TaskQueryItem[]
	groupSummary: TaskQueryGroupSummary[] | null
	options: ResolvedTaskDisplayOptions
}

export function applyTaskDisplayOptionsToTasks({
	items,
	groupSummary,
	options,
}: ApplyTaskDisplayOptionsInput): TaskDisplayApplyResult {
	// 窗口由统一查询排序；展示投影只能保留输入顺序。
	const sections = buildTaskDisplaySections(items, groupSummary, options.showEmptyGroups)
	return {
		options,
		orderedItems: items,
		selectionOrderIds: sections.flatMap((section) => section.tasks.map((task) => task.id)),
		sections,
		visibleProperties: [...options.visibleProperties],
	}
}
