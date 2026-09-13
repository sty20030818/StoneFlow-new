import type { FilterQuery } from './filterQuery'
import type { Scope } from './space'
import type { TaskListItem, TaskStatus } from './task'
import type { TaskPriority } from './taskPriority'

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
	definitionError?: null
}

/** 不可用记录只提供恢复所需元数据，不伪造可执行定义。 */
export type UnavailableView = Pick<View, 'id' | 'name' | 'position' | 'createdAt' | 'updatedAt'> & {
	scope: Scope | null
	definitionError: string
}

export type ViewListItem = View | UnavailableView

/** 单次任务窗口顺序；显示偏好拥有选择，统一查询拥有执行。 */
export const TASK_WINDOW_GROUP_BY_VALUES = [
	'none',
	'status',
	'priority',
	'project',
	'due',
	'scheduled',
] as const
export type TaskWindowGroupBy = (typeof TASK_WINDOW_GROUP_BY_VALUES)[number]
export const TASK_WINDOW_ORDER_BY_VALUES = [
	'smart',
	'manual',
	'priority',
	'status',
	'dueAt',
	'plannedAt',
	'statusChangedAt',
	'createdAt',
	'updatedAt',
	'completedAt',
	'canceledAt',
] as const
export const TASK_WINDOW_ORDER_DIRECTION_VALUES = ['asc', 'desc'] as const
export const TASK_WINDOW_COMPLETED_ORDER_VALUES = ['recency', 'natural'] as const
export type TaskWindowOrder = {
	groupBy: TaskWindowGroupBy
	orderBy: (typeof TASK_WINDOW_ORDER_BY_VALUES)[number]
	orderDirection: (typeof TASK_WINDOW_ORDER_DIRECTION_VALUES)[number]
	completedOrder: (typeof TASK_WINDOW_COMPLETED_ORDER_VALUES)[number]
}

export type TaskQueryWindow = {
	order: TaskWindowOrder
	/** 分页会话内固定的本地日历日期 YYYY-MM-DD。 */
	dateBasis: string
	cursor?: string | null
}

export type RunTaskViewInput = TaskQueryWindow & {
	scope: Scope
	viewId: string
	/** Filter Draft 存在时完整替换 View.filters。 */
	filters?: FilterQuery
}

/** Default View、Saved View 与计数消费者共用的成员资格定义。 */
export type TaskQueryDefinition = {
	scope: Scope
	context: TaskViewContext
	baseViewKey: TaskViewBaseKey
	filters: FilterQuery
}

export type RunTaskQueryInput = TaskQueryDefinition & TaskQueryWindow

export type CountTaskQueryInput = TaskQueryDefinition

/** 查询执行产生的主组身份；日期桶已绑定同一 cursor 的日历基准。 */
export type TaskQueryGroup =
	| { kind: 'none' }
	| { kind: 'status'; status: TaskStatus }
	| { kind: 'priority'; priority: TaskPriority }
	| { kind: 'project'; projectId: string | null; projectName: string | null }
	| {
			kind: 'due' | 'scheduled'
			bucket: 'overdue' | 'today' | 'tomorrow' | 'this-week' | 'later' | 'none'
	  }

/** 仅任务查询窗口携带组身份，不改变详情和其他任务消费者的 DTO。 */
export type TaskQueryItem = TaskListItem & { group: TaskQueryGroup }

export type RunTaskQueryResult = {
	items: TaskQueryItem[]
	/** 仅首屏存在；续页为 null。 */
	totalCount: number | null
	nextCursor: string | null
}

export type RunTaskViewResult = {
	view: View
	items: TaskQueryItem[]
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
