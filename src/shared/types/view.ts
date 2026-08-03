import type { FilterQuery } from './filterQuery'
import type { ProjectOverviewItem } from './project'
import type { Scope } from './space'
import type { TaskListItem } from './task'

export type ViewKind = 'system' | 'custom'
export type SystemViewKey = 'all' | 'active' | 'today' | 'upcoming' | 'overdue'

/** View 筛选真源 = FilterQuery（clause 列表）。 */
export type TaskViewFilters = FilterQuery

/**
 * 产品域 View：只含定义与元数据。
 * 呈现（sort/group/showCompleted）在 display-options，不进本类型。
 */
export type View = {
	id: string
	name: string
	kind: ViewKind
	systemKey: SystemViewKey | null
	scope: Scope
	filters: FilterQuery
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
	/** dirty 时 URL temp 覆盖 View.filters */
	filters?: FilterQuery
	limit?: number
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
	filters: FilterQuery
}

export type UpdateViewInput = {
	viewId: string
	name?: string
	scope?: Scope
	filters?: FilterQuery
}

export type RunProjectViewResult = {
	items: ProjectOverviewItem[]
}
