import type { FilterQuery } from './filterQuery'
import type { ProjectOverviewItem } from './project'
import type { Scope } from './space'
import type { TaskListItem } from './task'

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

/** @deprecated 呈现分组已迁 display-options；仅 Run 请求 / 旧数据迁移残留 */
export type TaskGroupBy = 'none' | 'status' | 'priority' | 'project' | 'due' | 'planned'

/**
 * View 筛选真源 = FilterQuery（clause 列表）。
 * 旧扁平 TaskViewFilters 已废弃；后端 decode 时一次性迁入 clause。
 */
export type TaskViewFilters = FilterQuery

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
	filters: FilterQuery
	/**
	 * 旧行可能非空；产品呈现勿读。迁移到 display 后应为空。
	 * @deprecated
	 */
	sort: ViewSortRule[]
	/**
	 * 旧行可能非 none；产品呈现勿读。
	 * @deprecated
	 */
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
	/** 临时覆盖 filters（URL）；clause 形状 */
	filters?: FilterQuery
	/** 请求期排序（Display），非 View 持久化 */
	sort?: ViewSortRule[]
	/** 请求期分组（Display） */
	groupBy?: TaskGroupBy | null
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
