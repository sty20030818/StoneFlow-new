import type { ProjectOverviewItem } from './project'
import type { Scope } from './space'
import type { TaskListItem, TaskStatus } from './task'
import type { TaskPriority } from './taskPriority'

export type ViewKind = 'system' | 'custom'
export type SystemViewKey = 'all' | 'active' | 'today' | 'upcoming' | 'overdue'
export type ViewSortDirection = 'asc' | 'desc'
export type ViewSortField =
	| 'position'
	| 'priority'
	| 'dueAt'
	| 'plannedAt'
	| 'createdAt'
	| 'updatedAt'
	| 'completedAt'

export type TaskGroupBy = 'none' | 'status' | 'priority' | 'project' | 'due' | 'planned'

export type DateFilterMode =
	| 'today'
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
	project?: {
		mode: 'any' | 'none' | 'specific'
		ids?: string[]
	}
	due?: DateFilter
	planned?: DateFilter
	created?: DateFilter
	updated?: DateFilter
	completed?: DateFilter
}

export type ViewSortRule = {
	field: ViewSortField
	direction: ViewSortDirection
}

export type View = {
	id: string
	name: string
	kind: ViewKind
	systemKey: SystemViewKey | null
	scope: Scope
	filters: TaskViewFilters
	sort: ViewSortRule[]
	groupBy: TaskGroupBy
	position: number
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
	viewKey?: SystemViewKey | null
	filters?: TaskViewFilters
	sort?: ViewSortRule[]
	groupBy?: TaskGroupBy | null
	/** 页大小；省略后端默认 */
	limit?: number
	/** 上一页最后一条 id */
	cursor?: string | null
}

export type RunTaskViewResult = {
	view: View
	items: TaskListItem[]
	groups: ViewTaskGroup[]
	totalCount: number
	nextCursor: string | null
}

export type CreateViewInput = {
	name: string
	scope: Scope
	filters: TaskViewFilters
	sort: ViewSortRule[]
	groupBy: TaskGroupBy
}

export type UpdateViewInput = {
	viewId: string
	name?: string
	scope?: Scope
	filters?: TaskViewFilters
	sort?: ViewSortRule[]
	groupBy?: TaskGroupBy | null
}

export type RunProjectViewResult = {
	items: ProjectOverviewItem[]
}
