import { z } from 'zod'
import {
	TASK_WINDOW_ORDER_BY_VALUES,
	TASK_WINDOW_ORDER_DIRECTION_VALUES,
	TASK_WINDOW_COMPLETED_ORDER_VALUES,
} from '@/shared/types'

export const TASK_DISPLAY_GROUP_BY_VALUES = [
	'none',
	'status',
	'priority',
	'project',
	'due',
	'scheduled',
] as const

export const TASK_DISPLAY_ORDER_BY_VALUES = TASK_WINDOW_ORDER_BY_VALUES
export const TASK_DISPLAY_ORDER_DIRECTION_VALUES = TASK_WINDOW_ORDER_DIRECTION_VALUES
export const TASK_DISPLAY_COMPLETED_ORDER_VALUES = TASK_WINDOW_COMPLETED_ORDER_VALUES

export const TASK_DISPLAY_PROPERTY_KEY_VALUES = [
	'status',
	'priority',
	'project',
	'dueAt',
	'plannedAt',
	'updatedAt',
	'createdAt',
] as const

export type TaskDisplayGroupBy = (typeof TASK_DISPLAY_GROUP_BY_VALUES)[number]
export type TaskDisplayOrderBy = (typeof TASK_DISPLAY_ORDER_BY_VALUES)[number]
export type TaskDisplayOrderDirection = (typeof TASK_DISPLAY_ORDER_DIRECTION_VALUES)[number]
export type TaskDisplayCompletedOrder = (typeof TASK_DISPLAY_COMPLETED_ORDER_VALUES)[number]
export type TaskDisplayPropertyKey = (typeof TASK_DISPLAY_PROPERTY_KEY_VALUES)[number]

/** 创建和更新时间共用一个展示槽；最后选择的时间属性生效。 */
export function getTaskDisplayTimestampProperty(
	values: readonly TaskDisplayPropertyKey[],
): 'createdAt' | 'updatedAt' | undefined {
	return values.findLast((value) => value === 'createdAt' || value === 'updatedAt')
}

export type TaskDisplayOptions = {
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

export const taskDisplayGroupBySchema = z.enum(TASK_DISPLAY_GROUP_BY_VALUES)
export const taskDisplayOrderBySchema = z.enum(TASK_DISPLAY_ORDER_BY_VALUES)
export const taskDisplayOrderDirectionSchema = z.enum(TASK_DISPLAY_ORDER_DIRECTION_VALUES)
export const taskDisplayCompletedOrderSchema = z.enum(TASK_DISPLAY_COMPLETED_ORDER_VALUES)
export const taskDisplayPropertyKeySchema = z.enum(TASK_DISPLAY_PROPERTY_KEY_VALUES)

export const taskDisplayOptionsSchema = z.object({
	groupBy: taskDisplayGroupBySchema,
	subGroupBy: taskDisplayGroupBySchema,
	orderBy: taskDisplayOrderBySchema,
	orderDirection: taskDisplayOrderDirectionSchema,
	completedOrder: taskDisplayCompletedOrderSchema,
	showEmptyGroups: z.boolean(),
	visibleProperties: z.array(taskDisplayPropertyKeySchema),
})
