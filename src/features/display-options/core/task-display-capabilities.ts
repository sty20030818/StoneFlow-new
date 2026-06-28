import {
	getTaskDisplayPageKind,
	type TaskDisplayPageKey,
	type TaskDisplayPageKind,
} from './display-page-key'
import type {
	DisplayLayoutMode,
	TaskDisplayCompletedOrder,
	TaskDisplayGroupBy,
	TaskDisplayOrderBy,
	TaskDisplayPropertyKey,
} from './task-display-options'

type TaskDisplayBoardCapabilities = {
	allowedGroupBy: readonly TaskDisplayGroupBy[]
	allowedSubGroupBy: readonly TaskDisplayGroupBy[]
}

export type TaskDisplayPageCapabilities = {
	allowedLayouts: readonly DisplayLayoutMode[]
	allowedGroupBy: readonly TaskDisplayGroupBy[]
	allowedSubGroupBy: readonly TaskDisplayGroupBy[]
	allowedOrderBy: readonly TaskDisplayOrderBy[]
	allowedCompletedOrder: readonly TaskDisplayCompletedOrder[]
	allowedVisibleProperties: readonly TaskDisplayPropertyKey[]
	supportsShowEmptyGroups: boolean
	board: TaskDisplayBoardCapabilities | null
}

const COMMON_VISIBLE_PROPERTIES = [
	'status',
	'priority',
	'project',
	'dueAt',
	'scheduledAt',
	'updatedAt',
	'createdAt',
] as const satisfies readonly TaskDisplayPropertyKey[]

const LIST_GROUPS = ['none', 'status', 'priority', 'project', 'due', 'scheduled'] as const satisfies readonly TaskDisplayGroupBy[]
const BOARD_GROUPS = ['status', 'priority', 'project'] as const satisfies readonly TaskDisplayGroupBy[]
const NO_SUB_GROUPS = ['none'] as const satisfies readonly TaskDisplayGroupBy[]

const ACTIVE_ORDER_BY = [
	'smart',
	'priority',
	'status',
	'dueAt',
	'scheduledAt',
	'statusChangedAt',
	'createdAt',
	'updatedAt',
] as const satisfies readonly TaskDisplayOrderBy[]

const INBOX_ORDER_BY = [
	'smart',
	'priority',
	'dueAt',
	'scheduledAt',
	'inboxAt',
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
	'scheduledAt',
	'statusChangedAt',
	'createdAt',
	'updatedAt',
] as const satisfies readonly TaskDisplayOrderBy[]

const COMMON_COMPLETED_ORDER = ['recency', 'natural'] as const satisfies readonly TaskDisplayCompletedOrder[]

const TASK_DISPLAY_PAGE_CAPABILITIES: Record<TaskDisplayPageKind, TaskDisplayPageCapabilities> = {
	'task:all': {
		allowedLayouts: ['list', 'board'],
		allowedGroupBy: LIST_GROUPS,
		allowedSubGroupBy: LIST_GROUPS,
		allowedOrderBy: ACTIVE_ORDER_BY,
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: {
			allowedGroupBy: BOARD_GROUPS,
			allowedSubGroupBy: NO_SUB_GROUPS,
		},
	},
	'task:inbox': {
		allowedLayouts: ['list'],
		allowedGroupBy: ['none', 'status', 'priority', 'project'],
		allowedSubGroupBy: ['none', 'status', 'priority'],
		allowedOrderBy: INBOX_ORDER_BY,
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: null,
	},
	'task:no-project': {
		allowedLayouts: ['list', 'board'],
		allowedGroupBy: LIST_GROUPS,
		allowedSubGroupBy: LIST_GROUPS,
		allowedOrderBy: ACTIVE_ORDER_BY,
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: {
			allowedGroupBy: ['status', 'priority'],
			allowedSubGroupBy: NO_SUB_GROUPS,
		},
	},
	'task:project-detail': {
		allowedLayouts: ['list', 'board'],
		allowedGroupBy: ['none', 'status', 'priority', 'due', 'scheduled'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'due', 'scheduled'],
		allowedOrderBy: PROJECT_DETAIL_ORDER_BY,
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: {
			allowedGroupBy: ['status', 'priority'],
			allowedSubGroupBy: NO_SUB_GROUPS,
		},
	},
	'task:view': {
		allowedLayouts: ['list', 'board'],
		allowedGroupBy: LIST_GROUPS,
		allowedSubGroupBy: LIST_GROUPS,
		allowedOrderBy: ACTIVE_ORDER_BY,
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: {
			allowedGroupBy: BOARD_GROUPS,
			allowedSubGroupBy: NO_SUB_GROUPS,
		},
	},
	'task:today': {
		allowedLayouts: ['list'],
		allowedGroupBy: ['none', 'status', 'priority', 'project', 'due'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['smart', 'priority', 'dueAt', 'scheduledAt', 'statusChangedAt', 'createdAt', 'updatedAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: null,
	},
	'task:focus': {
		allowedLayouts: ['list'],
		allowedGroupBy: ['none', 'status', 'priority', 'project', 'due', 'scheduled'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['smart', 'priority', 'dueAt', 'scheduledAt', 'statusChangedAt', 'createdAt', 'updatedAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: null,
	},
	'task:upcoming': {
		allowedLayouts: ['list'],
		allowedGroupBy: ['none', 'status', 'priority', 'project', 'scheduled'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['smart', 'priority', 'dueAt', 'scheduledAt', 'statusChangedAt', 'createdAt', 'updatedAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: null,
	},
	'task:overdue': {
		allowedLayouts: ['list'],
		allowedGroupBy: ['none', 'status', 'priority', 'project', 'due'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['smart', 'priority', 'dueAt', 'scheduledAt', 'statusChangedAt', 'createdAt', 'updatedAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: null,
	},
	'task:completed': {
		allowedLayouts: ['list'],
		allowedGroupBy: ['none', 'status', 'priority', 'project'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['priority', 'status', 'createdAt', 'updatedAt', 'completedAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: null,
	},
	'task:canceled': {
		allowedLayouts: ['list'],
		allowedGroupBy: ['none', 'status', 'priority', 'project'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['priority', 'status', 'createdAt', 'updatedAt', 'canceledAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: null,
	},
	'task:archived': {
		allowedLayouts: ['list'],
		allowedGroupBy: ['none', 'status', 'priority', 'project'],
		allowedSubGroupBy: ['none', 'status', 'priority', 'project'],
		allowedOrderBy: ['priority', 'status', 'createdAt', 'updatedAt'],
		allowedCompletedOrder: COMMON_COMPLETED_ORDER,
		allowedVisibleProperties: COMMON_VISIBLE_PROPERTIES,
		supportsShowEmptyGroups: true,
		board: null,
	},
}

export function getTaskDisplayPageCapabilities(pageKey: TaskDisplayPageKey): TaskDisplayPageCapabilities {
	return TASK_DISPLAY_PAGE_CAPABILITIES[getTaskDisplayPageKind(pageKey)]
}
