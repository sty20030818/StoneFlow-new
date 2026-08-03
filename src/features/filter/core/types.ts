/**
 * 筛选公式领域类型（无 React / 无 Tauri）。
 * 临时 URL、View.filters、chip 共用同一形状。
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

/** 日期 clause 取值（与历史 page date 枚举对齐，不含 none） */
export const FILTER_DATE_VALUE_VALUES = [
	'today',
	'tomorrow',
	'thisWeek',
	'overdue',
	'hasDate',
	'noDate',
] as const

export type FilterDateValue = (typeof FILTER_DATE_VALUE_VALUES)[number]

/** project：无项目 / 独立事项 */
export const FILTER_PROJECT_NONE_VALUE = '__none__' as const

export type FilterClause = {
	id: string
	field: FilterField
	op: FilterOp
	/** 规范化字符串；空数组在 normalize 时剔除整条 */
	values: string[]
}

export type FilterQuery = {
	clauses: FilterClause[]
}

export const EMPTY_FILTER_QUERY: FilterQuery = { clauses: [] }
