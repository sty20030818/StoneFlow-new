import {
	EMPTY_FILTER_QUERY,
	FILTER_DATE_VALUE_VALUES,
	FILTER_FIELD_VALUES,
	FILTER_OP_VALUES,
	FILTER_PROJECT_NONE_VALUE,
	type FilterClause,
	type FilterDateValue,
	type FilterField,
	type FilterOp,
	type FilterQuery,
} from './types'

const FIELD_SET = new Set<string>(FILTER_FIELD_VALUES)
const OP_SET = new Set<string>(FILTER_OP_VALUES)
const DATE_VALUE_SET = new Set<string>(FILTER_DATE_VALUE_VALUES)
const TASK_STATUS_SET = new Set(['todo', 'doing', 'waiting', 'done', 'canceled'])
const PRIORITY_SET = new Set(['0', '1', '2', '3', '4'])

const FIELD_ORDER = new Map(FILTER_FIELD_VALUES.map((field, index) => [field, index]))

/** 条件间保持 AND；只做条内去重、相同条件去重和稳定排序。非法定义明确失败。 */
export function normalizeFilterQuery(query: FilterQuery | null | undefined): FilterQuery {
	if (query == null) return EMPTY_FILTER_QUERY
	if (
		typeof query !== 'object' ||
		Array.isArray(query) ||
		!Array.isArray(query.clauses) ||
		Object.keys(query).some((key) => key !== 'clauses')
	) {
		throw new Error('筛选定义无效：缺少有效的条件列表。')
	}

	const unique = new Map<string, FilterClause>()
	for (const raw of query.clauses) {
		const clause = normalizeClause(raw)
		const key = JSON.stringify([clause.field, clause.op, clause.values])
		if (!unique.has(key)) unique.set(key, clause)
	}
	const clauses = [...unique.values()].toSorted(
		(left, right) =>
			FIELD_ORDER.get(left.field)! - FIELD_ORDER.get(right.field)! ||
			compareText(left.op, right.op) ||
			compareText(JSON.stringify(left.values), JSON.stringify(right.values)),
	)
	// ID 只用于定位编辑项；补齐或去重不能改变查询含义，也不能在每次读取时随机变化。
	const reserved = new Set(clauses.map((clause) => clause.id))
	const used = new Set<string>()
	return {
		clauses: clauses.map((clause, index) => {
			let id = clause.id
			if (!id || used.has(id)) {
				id = `fc_${index}`
				while (reserved.has(id) || used.has(id)) id += '_'
			}
			used.add(id)
			return { ...clause, id }
		}),
	}
}

export function isFilterQueryEmpty(query: FilterQuery | null | undefined): boolean {
	return normalizeFilterQuery(query).clauses.length === 0
}

export function filterQueriesEqual(
	left: FilterQuery | null | undefined,
	right: FilterQuery | null | undefined,
): boolean {
	const a = normalizeFilterQuery(left)
	const b = normalizeFilterQuery(right)
	if (a.clauses.length !== b.clauses.length) {
		return false
	}
	for (let i = 0; i < a.clauses.length; i++) {
		const lc = a.clauses[i]!
		const rc = b.clauses[i]!
		if (lc.field !== rc.field || lc.op !== rc.op) {
			return false
		}
		if (lc.values.length !== rc.values.length) {
			return false
		}
		for (let j = 0; j < lc.values.length; j++) {
			if (lc.values[j] !== rc.values[j]) {
				return false
			}
		}
	}
	return true
}

/** 生成 clause id（浏览器 / Bun 均有 randomUUID） */
export function createFilterClauseId(): string {
	if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
		return crypto.randomUUID()
	}
	return `fc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`
}

export function createFilterClause(
	field: FilterField,
	op: FilterOp,
	values: readonly string[],
	id?: string,
): FilterClause {
	return {
		id: id ?? createFilterClauseId(),
		field,
		op,
		values: [...values],
	}
}

function normalizeClause(raw: unknown): FilterClause {
	if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
		throw new Error('筛选条件无效。')
	}
	const record = raw as Partial<FilterClause>
	if (
		Object.keys(record).some((key) => !['id', 'field', 'op', 'values'].includes(key)) ||
		(record.id !== undefined && typeof record.id !== 'string') ||
		typeof record.field !== 'string' ||
		!FIELD_SET.has(record.field) ||
		typeof record.op !== 'string' ||
		!OP_SET.has(record.op) ||
		!Array.isArray(record.values) ||
		record.values.length === 0 ||
		!record.values.every(
			(value) =>
				typeof value === 'string' &&
				value.length > 0 &&
				value === value.trim() &&
				isAllowedValue(record.field!, value),
		)
	) {
		throw new Error('筛选条件无效：字段、操作符或条件值不受支持。')
	}
	return {
		id: record.id ?? '',
		field: record.field,
		op: record.op,
		values: sortValues(record.field, [...new Set(record.values)]),
	}
}

function compareText(left: string, right: string): number {
	return left < right ? -1 : left > right ? 1 : 0
}

function isAllowedValue(field: FilterField, value: string): boolean {
	switch (field) {
		case 'status':
			return TASK_STATUS_SET.has(value)
		case 'priority':
			return PRIORITY_SET.has(value)
		case 'project':
			return value === FILTER_PROJECT_NONE_VALUE || value.length > 0
		case 'due':
		case 'planned':
			return DATE_VALUE_SET.has(value)
		default:
			return false
	}
}

function sortValues(field: FilterField, values: string[]): string[] {
	if (field === 'priority') {
		return values.toSorted((a, b) => Number(b) - Number(a))
	}
	if (field === 'status') {
		const order = ['todo', 'doing', 'waiting', 'done', 'canceled']
		const rank = new Map(order.map((item, index) => [item, index]))
		return values.toSorted((a, b) => (rank.get(a) ?? 99) - (rank.get(b) ?? 99))
	}
	return values.toSorted(compareText)
}

export function isFilterDateValue(value: string): value is FilterDateValue {
	return DATE_VALUE_SET.has(value)
}
