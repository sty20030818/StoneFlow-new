/**
 * 旧扁平 querySlice ↔ FilterQuery 桥（P4 删 PageFilter 后可移除）。
 */
import type { TaskStatus } from '@/shared/types'
import { EMPTY_FILTER_QUERY } from '@/shared/types'

import {
	createFilterClause,
	normalizeFilterQuery,
	type FilterDateValue,
	type FilterQuery,
} from '../core'
import type { PageDateFilterValue } from './PageFilterProvider'

/** 与 useTaskPageFilterController.querySlice 对齐 */
export type PageFilterQuerySlice = {
	priorityValues: number[]
	statusValues: TaskStatus[]
	dateValue: PageDateFilterValue
	projectId: string | null
	standaloneOnly?: boolean
}

export function pageFilterSliceToFilterQuery(slice: PageFilterQuerySlice): FilterQuery {
	const clauses = []

	if (slice.statusValues.length > 0) {
		clauses.push(createFilterClause('status', 'is', slice.statusValues))
	}
	if (slice.priorityValues.length > 0) {
		clauses.push(
			createFilterClause(
				'priority',
				'is',
				slice.priorityValues.map((value) => String(value)),
			),
		)
	}
	if (slice.dateValue !== 'none' && isFilterDateValue(slice.dateValue)) {
		clauses.push(createFilterClause('due', 'is', [slice.dateValue]))
	}
	if (slice.projectId) {
		clauses.push(createFilterClause('project', 'is', [slice.projectId]))
	} else if (slice.standaloneOnly) {
		clauses.push(createFilterClause('project', 'is', ['__none__']))
	}

	return clauses.length > 0 ? normalizeFilterQuery({ clauses }) : EMPTY_FILTER_QUERY
}

function isFilterDateValue(value: string): value is FilterDateValue {
	return (
		value === 'today' ||
		value === 'tomorrow' ||
		value === 'thisWeek' ||
		value === 'overdue' ||
		value === 'hasDate' ||
		value === 'noDate'
	)
}
