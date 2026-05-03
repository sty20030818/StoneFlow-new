import type { ProjectOverviewItem } from './project'
import type { Scope } from './space'
import type { TaskListItem, TaskStatus } from './task'
import type { TaskPriority } from './taskPriority'

export type ViewEntityType = 'task' | 'project'
export type ViewKind = 'system' | 'custom'
export type ViewSortDirection = 'asc' | 'desc'
export type ViewSortField =
	| 'sortOrder'
	| 'priority'
	| 'dueAt'
	| 'scheduledAt'
	| 'createdAt'
	| 'updatedAt'
	| 'completedAt'

export type TaskGroupBy = 'none' | 'status' | 'priority' | 'project' | 'due' | 'scheduled'

export type DateFilterMode =
	| 'today'
	| 'tomorrow'
	| 'this_week'
	| 'next_week'
	| 'overdue'
	| 'future'
	| 'past'
	| 'between'
	| 'none'
	| 'not_none'

export type DateFilter = {
	mode: DateFilterMode
	from?: string
	to?: string
}

export type TaskViewFilters = {
	status?: TaskStatus[]
	priority?: {
		eq?: TaskPriority
		gte?: TaskPriority
		lte?: TaskPriority
	}
	inbox?: boolean
	project?: {
		mode: 'any' | 'none' | 'specific'
		ids?: string[]
	}
	due?: DateFilter
	scheduled?: DateFilter
	created?: DateFilter
	updated?: DateFilter
	completed?: DateFilter
	archived?: boolean
	deleted?: boolean
}

export type ViewSortRule = {
	field: ViewSortField
	direction: ViewSortDirection
}

export type View = {
	id: string
	name: string
	description: string | null
	type: ViewKind
	entityType: ViewEntityType
	key: string | null
	filters: TaskViewFilters | Record<string, unknown>
	sort: ViewSortRule[]
	groupBy: TaskGroupBy | null
	isVisible: boolean
	sortOrder: number
	createdAt: string
	updatedAt: string
}

export type ViewTaskGroup = {
	key: string
	label: string
	taskIds: string[]
}

export type RunTaskViewInput = {
	scope: Scope
	viewId?: string | null
	viewKey?: string | null
	placement?: {
		kind: 'all' | 'project' | 'inbox' | 'noProject'
		projectId?: string
	} | null
}

export type RunTaskViewResult = {
	view: View
	items: TaskListItem[]
	groups: ViewTaskGroup[]
}

export type CreateViewInput = {
	entityType: ViewEntityType
	name: string
	description?: string | null
	filters: TaskViewFilters
	sort: ViewSortRule[]
	groupBy?: TaskGroupBy | null
}

export type UpdateViewInput = {
	viewId: string
	name?: string
	description?: string | null
	filters?: TaskViewFilters
	sort?: ViewSortRule[]
	groupBy?: TaskGroupBy | null
}

export type ReorderViewsInput = {
	entityType: ViewEntityType
	orderedIds: string[]
}

export type RunProjectViewResult = {
	items: ProjectOverviewItem[]
}
