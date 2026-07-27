import {
	getTaskDisplayPageKind,
	type TaskDisplayPageKey,
	type TaskDisplayPageKind,
} from './display-page-key'
import type {
	TaskDisplayCompletedOrder,
	TaskDisplayGroupBy,
	TaskDisplayOrderBy,
	TaskDisplayPropertyKey,
} from './task-display-options'

export type TaskDisplayPageCapabilities = {
	allowedGroupBy: readonly TaskDisplayGroupBy[]
	allowedSubGroupBy: readonly TaskDisplayGroupBy[]
	allowedOrderBy: readonly TaskDisplayOrderBy[]
	allowedCompletedOrder: readonly TaskDisplayCompletedOrder[]
	allowedVisibleProperties: readonly TaskDisplayPropertyKey[]
	supportsShowEmptyGroups: boolean
}

const COMMON_VISIBLE_PROPERTIES = [
	'status',
	'priority',
	'project',
	'dueAt',
	'plannedAt',
	'updatedAt',
	'createdAt',
] as const satisfies readonly TaskDisplayPropertyKey[]

const LIST_GROUPS = [
	'none',
	'status',
	'priority',
	'project',
	'due',
	'scheduled',
] as const satisfies readonly TaskDisplayGroupBy[]
const ACTIVE_ORDER_BY = [
	'smart',
	'priority',
	'status',
	'dueAt',
	'plannedAt',
	'statusChangedAt',
	'createdAt',
	'updatedAt',
] as const satisfies readonly TaskDisplayOrderBy[]

const PROJECT_DETAIL_ORDER_BY = [
	'manual',
	'smart',
	'priority',
	'status',
	'dueAt',
	'plannedAt',
	'statusChangedAt',
	'createdAt',
	'updatedAt',
] as const satisfies readonly TaskDisplayOrderBy[]

const COMMON_COMPLETED_ORDER = [
	'recency',
	'natural',
] as const satisfies readonly TaskDisplayCompletedOrder[]

const TASK_DISPLAY_PAGE_CAPABILITIES: Record<TaskDisplayPageKind, TaskDisplayPageCapabilities> = {
	'task:all': {
		allowedGroupBy: LIST_GROUPS,
		allowedSubGroupBy: LIST_GROUPS,
		allowedOrderBy: ACTIVE_ORDER_BY,
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:standalone': {
		allowedGroupBy: LIST_GROUPS,
		allowedSubGroupBy: LIST_GROUPS,
		allowedOrderBy: ACTIVE_ORDER_BY,
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:project-detail': {
		allowedGroupBy: ['none', 'status', 'priority', 'due', 'scheduled'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'due', 'scheduled'],
		allowedOrderBy: PROJECT_DETAIL_ORDER_BY,
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:view': {
		allowedGroupBy: LIST_GROUPS,
		allowedSubGroupBy: LIST_GROUPS,
		allowedOrderBy: ACTIVE_ORDER_BY,
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:today': {
		allowedGroupBy: ['none', 'status', 'priority', 'project', 'due'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: [
			'smart',
			'priority',
			'dueAt',
			'plannedAt',
			'statusChangedAt',
			'createdAt',
			'updatedAt',
		],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:focus': {
		allowedGroupBy: ['none', 'status', 'priority', 'project', 'due', 'scheduled'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: [
			'smart',
			'priority',
			'dueAt',
			'plannedAt',
			'statusChangedAt',
			'createdAt',
			'updatedAt',
		],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:upcoming': {
		allowedGroupBy: ['none', 'status', 'priority', 'project', 'scheduled'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: [
			'smart',
			'priority',
			'dueAt',
			'plannedAt',
			'statusChangedAt',
			'createdAt',
			'updatedAt',
		],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:overdue': {
		allowedGroupBy: ['none', 'status', 'priority', 'project', 'due'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: [
			'smart',
			'priority',
			'dueAt',
			'plannedAt',
			'statusChangedAt',
			'createdAt',
			'updatedAt',
		],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:completed': {
		allowedGroupBy: ['none', 'status', 'priority', 'project'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['priority', 'status', 'createdAt', 'updatedAt', 'completedAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:canceled': {
		allowedGroupBy: ['none', 'status', 'priority', 'project'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['priority', 'status', 'createdAt', 'updatedAt', 'canceledAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
	'task:archived': {
		allowedGroupBy: ['none', 'status', 'priority', 'project'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['priority', 'status', 'createdAt', 'updatedAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
	},
}

export function getTaskDisplayPageCapabilities(
	pageKey: TaskDisplayPageKey,
): TaskDisplayPageCapabilities {
	return TASK_DISPLAY_PAGE_CAPABILITIES[getTaskDisplayPageKind(pageKey)]
}
