import type { FilterQuery } from './filterQuery'
import type { Scope } from './space'
import type { TaskListItem } from './task'

/** Task Workspace 的稳定查询基线；它不是持久化 View 实体。 */
export type TaskViewBaseKey = 'all' | 'active' | 'completed' | 'today' | 'upcoming'

/** Saved View 的不可移除查询边界。 */
export type TaskViewContext =
	| { kind: 'all' }
	| { kind: 'standalone' }
	| { kind: 'project'; projectId: string }

/**
 * 产品域 View：只含定义与元数据。
 * 呈现（sort/group/字段可见性）在 display-options，不进本类型。
 */
export type View = {
	id: string
	name: string
	scope: Scope
	context: TaskViewContext
	baseViewKey: TaskViewBaseKey
	filters: FilterQuery
	position: number
	createdAt: string
	updatedAt: string
	/** 旧定义无法无损升级时仅供 Library 展示与删除；不得执行查询或编辑定义。 */
	definitionError?: string | null
}

export type RunTaskViewInput = {
	scope: Scope
	viewId: string
	/** Filter Draft 存在时完整替换 View.filters。 */
	filters?: FilterQuery
	cursor?: string | null
}

/** Default View、Saved View 与计数消费者共用的成员资格定义。 */
export type TaskQueryDefinition = {
	scope: Scope
	context: TaskViewContext
	baseViewKey: TaskViewBaseKey
	filters: FilterQuery
}

export type RunTaskQueryInput = TaskQueryDefinition & {
	cursor?: string | null
}

export type CountTaskQueryInput = TaskQueryDefinition

export type RunTaskQueryResult = {
	items: TaskListItem[]
	/** 仅首屏存在；续页为 null。 */
	totalCount: number | null
	nextCursor: string | null
}

export type RunTaskViewResult = {
	view: View
	items: TaskListItem[]
	/** 仅首屏存在；续页为 null。 */
	totalCount: number | null
	nextCursor: string | null
}

export type CreateViewInput = {
	name: string
	scope: Scope
	context: TaskViewContext
	baseViewKey: TaskViewBaseKey
	filters: FilterQuery
}

export type UpdateViewInput = {
	viewId: string
	name?: string
	scope?: Scope
	context?: TaskViewContext
	baseViewKey?: TaskViewBaseKey
	filters?: FilterQuery
}
