import {
	createFilterClause,
	FILTER_PROJECT_NONE_VALUE,
	normalizeFilterQuery,
	type FilterQuery,
} from '@/features/filter'
import type { TaskGroupBy, TaskStatus, ViewSortField, ViewSortRule } from '@/shared/types'
import { EMPTY_FILTER_QUERY } from '@/shared/types'

export type ViewSearchDefinition = {
	/** 临时 filters（clause）；可与 URL `f` 并存，后续统一 */
	filters: FilterQuery
	/** 请求期 sort（Display）；非 View 持久化 */
	sort: ViewSortRule[]
	groupBy: TaskGroupBy | null
}

const TASK_STATUSES = ['todo', 'doing', 'waiting', 'done', 'canceled'] as const
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

/**
 * 解析旧式 search 键（status/due/…）为 FilterQuery + 请求期 sort/group。
 * 呈现真源仍以 display 为准；此处 group/sort 仅 run 请求覆盖。
 */
export function parseViewSearch(search: Record<string, unknown>): ViewSearchDefinition {
	const clauses = []
	const status = parseCsv(search.status).filter(isTaskStatus)
	const sortField = getOne(search.sortField)
	const sortDirection = getOne(search.sortDirection)
	const groupBy = getOne(search.groupBy)
	const due = getOne(search.due)
	const planned = getOne(search.planned)
	const projectMode = getOne(search.projectMode)
	const projectIds = parseCsv(search.projectIds)

	if (status.length > 0) {
		clauses.push(createFilterClause('status', 'is', status))
	}
	const dueValue = mapLegacyDateSearch(due)
	if (dueValue) {
		clauses.push(createFilterClause('due', 'is', [dueValue]))
	}
	const plannedValue = mapLegacyDateSearch(planned)
	if (plannedValue) {
		clauses.push(createFilterClause('planned', 'is', [plannedValue]))
	}
	if (projectMode === 'none') {
		clauses.push(createFilterClause('project', 'is', [FILTER_PROJECT_NONE_VALUE]))
	}
	if (projectMode === 'specific' && projectIds.length > 0) {
		clauses.push(createFilterClause('project', 'is', projectIds))
	}

	return {
		filters: clauses.length > 0 ? normalizeFilterQuery({ clauses }) : EMPTY_FILTER_QUERY,
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

function isGroupBy(value: string | null): value is TaskGroupBy {
	return GROUP_BY_VALUES.includes(value as TaskGroupBy)
}

function isSortField(value: string | null): value is ViewSortField {
	return SORT_FIELDS.includes(value as ViewSortField)
}

function mapLegacyDateSearch(value: string | null): string | null {
	if (!value) return null
	if (value === 'today' || value === 'overdue' || value === 'hasDate' || value === 'noDate') {
		return value
	}
	if (value === 'not_none') return 'hasDate'
	if (value === 'none') return 'noDate'
	if (value === 'future' || value === 'tomorrow' || value === 'thisWeek') return 'tomorrow'
	if (value === 'past') return 'overdue'
	return null
}
