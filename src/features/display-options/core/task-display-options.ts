import { z } from 'zod'

export const TASK_DISPLAY_LAYOUT_MODE_VALUES = ['list', 'board'] as const

export const TASK_DISPLAY_GROUP_BY_VALUES = [
	'none',
	'status',
	'priority',
	'project',
	'due',
	'scheduled',
] as const

export const TASK_DISPLAY_ORDER_BY_VALUES = [
	'smart',
	'manual',
	'priority',
	'status',
	'dueAt',
	'scheduledAt',
	'inboxAt',
	'statusChangedAt',
	'createdAt',
	'updatedAt',
	'completedAt',
	'canceledAt',
] as const

export const TASK_DISPLAY_ORDER_DIRECTION_VALUES = ['asc', 'desc'] as const

export const TASK_DISPLAY_COMPLETED_ORDER_VALUES = ['recency', 'natural'] as const

export const TASK_DISPLAY_PROPERTY_KEY_VALUES = [
	'status',
	'priority',
	'project',
	'dueAt',
	'scheduledAt',
	'updatedAt',
	'createdAt',
] as const

export type DisplayLayoutMode = (typeof TASK_DISPLAY_LAYOUT_MODE_VALUES)[number]
export type TaskDisplayGroupBy = (typeof TASK_DISPLAY_GROUP_BY_VALUES)[number]
export type TaskDisplayOrderBy = (typeof TASK_DISPLAY_ORDER_BY_VALUES)[number]
export type TaskDisplayOrderDirection = (typeof TASK_DISPLAY_ORDER_DIRECTION_VALUES)[number]
export type TaskDisplayCompletedOrder = (typeof TASK_DISPLAY_COMPLETED_ORDER_VALUES)[number]
export type TaskDisplayPropertyKey = (typeof TASK_DISPLAY_PROPERTY_KEY_VALUES)[number]

export type TaskDisplayOptions = {
	layout: DisplayLayoutMode
	groupBy: TaskDisplayGroupBy
	subGroupBy: TaskDisplayGroupBy
	orderBy: TaskDisplayOrderBy
	orderDirection: TaskDisplayOrderDirection
	completedOrder: TaskDisplayCompletedOrder
	showEmptyGroups: boolean
	visibleProperties: TaskDisplayPropertyKey[]
}

export type TaskDisplayPreferenceRecord = Partial<TaskDisplayOptions>

export type ResolvedTaskDisplayOptions = TaskDisplayOptions

export const taskDisplayLayoutModeSchema = z.enum(TASK_DISPLAY_LAYOUT_MODE_VALUES)
export const taskDisplayGroupBySchema = z.enum(TASK_DISPLAY_GROUP_BY_VALUES)
export const taskDisplayOrderBySchema = z.enum(TASK_DISPLAY_ORDER_BY_VALUES)
export const taskDisplayOrderDirectionSchema = z.enum(TASK_DISPLAY_ORDER_DIRECTION_VALUES)
export const taskDisplayCompletedOrderSchema = z.enum(TASK_DISPLAY_COMPLETED_ORDER_VALUES)
export const taskDisplayPropertyKeySchema = z.enum(TASK_DISPLAY_PROPERTY_KEY_VALUES)

export const taskDisplayOptionsSchema = z.object({
	layout: taskDisplayLayoutModeSchema,
	groupBy: taskDisplayGroupBySchema,
	subGroupBy: taskDisplayGroupBySchema,
	orderBy: taskDisplayOrderBySchema,
	orderDirection: taskDisplayOrderDirectionSchema,
	completedOrder: taskDisplayCompletedOrderSchema,
	showEmptyGroups: z.boolean(),
	visibleProperties: z.array(taskDisplayPropertyKeySchema),
})
