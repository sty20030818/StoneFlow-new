import type {
	ResolvedTaskDisplayOptions,
	TaskDisplayPageKey,
} from '@/features/display-options/core'

import { createTaskDisplayComparator } from './task-display-compare'
import { buildTaskDisplaySections } from './task-display-groups'
import type { TaskDisplayApplyContext, TaskDisplayApplyResult } from './task-display-types'
import type { TaskListItem } from '@/shared/types'

type ApplyTaskDisplayOptionsInput = {
	items: TaskListItem[]
	options: ResolvedTaskDisplayOptions
	context: TaskDisplayApplyContext
}

export function applyTaskDisplayOptionsToTasks({
	items,
	options,
	context,
}: ApplyTaskDisplayOptionsInput): TaskDisplayApplyResult {
	const orderedItems = [...items].sort(
		createTaskDisplayComparator(options, { pageKey: context.pageKey }),
	)
	const sections = buildTaskDisplaySections(orderedItems, options, context)
	const selectionOrderIds = sections.flatMap((section) => section.tasks.map((task) => task.id))
	const visibleProperties = [...options.visibleProperties]

	return {
		options,
		orderedItems,
		selectionOrderIds,
		sections,
		visibleProperties,
		boardPatch: {
			customSections:
				options.groupBy === 'status'
					? undefined
					: sections.map((section) => ({
							key: section.key,
							label: section.label,
							tasks: section.tasks,
						})),
			statusOrder:
				options.groupBy === 'status' ? ['doing', 'todo', 'waiting', 'done', 'canceled'] : undefined,
			hideEmptySections: !context.includeEmptySections,
		},
	}
}

export function createTaskDisplayApplyContext(
	pageKey: TaskDisplayPageKey,
): TaskDisplayApplyContext {
	return {
		pageKey,
		includeEmptySections: false,
	}
}
