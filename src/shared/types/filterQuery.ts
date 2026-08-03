/**
 * 筛选公式 DTO（前后端 / View.filters / URL 共用形状）。
 * 领域纯函数在 `@/features/filter/core`。
 */

export const FILTER_FIELD_VALUES = [
	'status',
	'priority',
	'project',
	'due',
	'planned',
] as const

export type FilterField = (typeof FILTER_FIELD_VALUES)[number]

export const FILTER_OP_VALUES = ['is', 'is_not'] as const

export type FilterOp = (typeof FILTER_OP_VALUES)[number]

export const FILTER_DATE_VALUE_VALUES = [
	'today',
	'tomorrow',
	'thisWeek',
	'overdue',
	'hasDate',
	'noDate',
] as const

export type FilterDateValue = (typeof FILTER_DATE_VALUE_VALUES)[number]

export const FILTER_PROJECT_NONE_VALUE = '__none__' as const

export type FilterClause = {
	id: string
	field: FilterField
	op: FilterOp
	values: string[]
}

export type FilterQuery = {
	clauses: FilterClause[]
}

export const EMPTY_FILTER_QUERY: FilterQuery = { clauses: [] }
