import type {
	TaskGroupBy,
	TaskStatus,
	TaskViewFilters,
	ViewSortField,
	ViewSortRule,
} from '@/shared/types'

export type ViewSearchDefinition = {
	filters: TaskViewFilters
	sort: ViewSortRule[]
	groupBy: TaskGroupBy | null
}

const TASK_STATUSES = ['todo', 'doing', 'waiting', 'done', 'canceled'] as const
const DATE_MODES = ['today', 'overdue', 'future', 'past', 'between', 'none', 'not_none'] as const
const GROUP_BY_VALUES = ['none', 'status', 'priority', 'project', 'due', 'planned'] as const
const SORT_FIELDS = [
	'position',
	'priority',
	'dueAt',
	'plannedAt',
	'createdAt',
	'updatedAt',
	'completedAt',
] as const

export function parseViewSearch(search: Record<string, unknown>): ViewSearchDefinition {
	const filters: TaskViewFilters = {}
	const status = parseCsv(search.status).filter(isTaskStatus)
	const sortField = getOne(search.sortField)
	const sortDirection = getOne(search.sortDirection)
	const groupBy = getOne(search.groupBy)
	const due = getOne(search.due)
	const planned = getOne(search.planned)
	const projectMode = getOne(search.projectMode)
	const projectIds = parseCsv(search.projectIds)

	if (status.length > 0) filters.status = status
	if (isDateMode(due)) filters.due = { mode: due }
	if (isDateMode(planned)) filters.planned = { mode: planned }
	if (projectMode === 'none') filters.project = { mode: 'none' }
	if (projectMode === 'specific' && projectIds.length > 0) {
		filters.project = { mode: 'specific', ids: projectIds }
	}

	return {
		filters,
		sort:
			isSortField(sortField) && (sortDirection === 'asc' || sortDirection === 'desc')
				? [{ field: sortField, direction: sortDirection }]
				: [],
		groupBy: isGroupBy(groupBy) ? groupBy : null,
	}
}

function parseCsv(value: unknown): string[] {
	const raw = getOne(value)
	return raw
		? raw
				.split(',')
				.map((item: string) => item.trim())
				.filter(Boolean)
		: []
}

function getOne(value: unknown): string | null {
	return typeof value === 'string' ? value : Array.isArray(value) ? getOne(value[0]) : null
}

function isTaskStatus(value: string): value is TaskStatus {
	return TASK_STATUSES.includes(value as TaskStatus)
}

function isDateMode(value: string | null): value is NonNullable<TaskViewFilters['due']>['mode'] {
	return DATE_MODES.includes(value as NonNullable<TaskViewFilters['due']>['mode'])
}

function isGroupBy(value: string | null): value is TaskGroupBy {
	return GROUP_BY_VALUES.includes(value as TaskGroupBy)
}

function isSortField(value: string | null): value is ViewSortField {
	return SORT_FIELDS.includes(value as ViewSortField)
}
