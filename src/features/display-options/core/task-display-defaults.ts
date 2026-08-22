import {
	getTaskDisplayPageKind,
	type TaskDisplayPageKey,
	type TaskDisplayPageKind,
} from './display-page-key'
import type { TaskDisplayOptions } from './task-display-options'

const DEFAULT_VISIBLE_PROPERTIES = ['status', 'priority', 'project', 'dueAt'] as const
const DEFAULT_PROJECT_DETAIL_VISIBLE_PROPERTIES = [
	'status',
	'priority',
	'dueAt',
	'plannedAt',
	'updatedAt',
] as const
const DEFAULT_STANDALONE_VISIBLE_PROPERTIES = [
	'status',
	'priority',
	'project',
	'createdAt',
] as const
const DEFAULT_DATE_FOCUSED_VISIBLE_PROPERTIES = [
	'status',
	'priority',
	'project',
	'dueAt',
	'plannedAt',
] as const
const DEFAULT_HISTORY_VISIBLE_PROPERTIES = ['status', 'priority', 'project', 'updatedAt'] as const

export const BASE_TASK_DISPLAY_OPTIONS: TaskDisplayOptions = {
	groupBy: 'status',
	subGroupBy: 'none',
	orderBy: 'smart',
	orderDirection: 'desc',
	completedOrder: 'recency',
	showEmptyGroups: false,
	visibleProperties: [...DEFAULT_VISIBLE_PROPERTIES],
}

const TASK_DISPLAY_PAGE_DEFAULTS: Record<TaskDisplayPageKind, TaskDisplayOptions> = {
	'task:all': {
		...BASE_TASK_DISPLAY_OPTIONS,
		visibleProperties: [...DEFAULT_VISIBLE_PROPERTIES],
	},
	'task:standalone': {
		...BASE_TASK_DISPLAY_OPTIONS,
		orderBy: 'updatedAt',
		orderDirection: 'desc',
		visibleProperties: [...DEFAULT_STANDALONE_VISIBLE_PROPERTIES],
	},
	'task:project-detail': {
		...BASE_TASK_DISPLAY_OPTIONS,
		orderBy: 'manual',
		orderDirection: 'asc',
		visibleProperties: [...DEFAULT_PROJECT_DETAIL_VISIBLE_PROPERTIES],
	},
	'task:view': {
		...BASE_TASK_DISPLAY_OPTIONS,
		visibleProperties: [...DEFAULT_VISIBLE_PROPERTIES],
	},
	'task:today': {
		...BASE_TASK_DISPLAY_OPTIONS,
		groupBy: 'none',
		orderBy: 'dueAt',
		orderDirection: 'asc',
		visibleProperties: [...DEFAULT_DATE_FOCUSED_VISIBLE_PROPERTIES],
	},
	'task:focus': {
		...BASE_TASK_DISPLAY_OPTIONS,
		groupBy: 'status',
		orderBy: 'smart',
		orderDirection: 'desc',
		visibleProperties: [...DEFAULT_DATE_FOCUSED_VISIBLE_PROPERTIES],
	},
	'task:upcoming': {
		...BASE_TASK_DISPLAY_OPTIONS,
		groupBy: 'scheduled',
		orderBy: 'plannedAt',
		orderDirection: 'asc',
		visibleProperties: [...DEFAULT_DATE_FOCUSED_VISIBLE_PROPERTIES],
	},
	'task:overdue': {
		...BASE_TASK_DISPLAY_OPTIONS,
		groupBy: 'due',
		orderBy: 'dueAt',
		orderDirection: 'asc',
		visibleProperties: [...DEFAULT_DATE_FOCUSED_VISIBLE_PROPERTIES],
	},
	'task:completed': {
		...BASE_TASK_DISPLAY_OPTIONS,
		groupBy: 'none',
		orderBy: 'completedAt',
		orderDirection: 'desc',
		visibleProperties: [...DEFAULT_HISTORY_VISIBLE_PROPERTIES],
	},
	'task:canceled': {
		...BASE_TASK_DISPLAY_OPTIONS,
		groupBy: 'none',
		orderBy: 'canceledAt',
		orderDirection: 'desc',
		visibleProperties: [...DEFAULT_HISTORY_VISIBLE_PROPERTIES],
	},
	'task:archived': {
		...BASE_TASK_DISPLAY_OPTIONS,
		groupBy: 'none',
		orderBy: 'updatedAt',
		orderDirection: 'desc',
		visibleProperties: [...DEFAULT_HISTORY_VISIBLE_PROPERTIES],
	},
}

export function getTaskDisplaySystemDefaults(pageKey: TaskDisplayPageKey): TaskDisplayOptions {
	const defaults = TASK_DISPLAY_PAGE_DEFAULTS[getTaskDisplayPageKind(pageKey)]

	return {
		...defaults,
		visibleProperties: [...defaults.visibleProperties],
	}
}
