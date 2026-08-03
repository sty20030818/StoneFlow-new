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

/**
 * 规范化：丢非法 field/op/value、丢空 values、同 field+op 合并 values、稳定排序。
 * 不生成 id；合并时保留先出现 clause 的 id。
 */
export function normalizeFilterQuery(query: FilterQuery | null | undefined): FilterQuery {
	if (!query || !Array.isArray(query.clauses)) {
		return EMPTY_FILTER_QUERY
	}

	const merged = new Map<string, FilterClause>()

	for (const raw of query.clauses) {
		const clause = normalizeClause(raw)
		if (!clause) {
			continue
		}
		const key = `${clause.field}\0${clause.op}`
		const existing = merged.get(key)
		if (!existing) {
			merged.set(key, clause)
			continue
		}
		const valueSet = new Set([...existing.values, ...clause.values])
		merged.set(key, {
			...existing,
			values: sortValues(clause.field, [...valueSet]),
		})
	}

	const clauses = [...merged.values()].toSorted((left, right) => {
		const fieldDelta = (FIELD_ORDER.get(left.field) ?? 99) - (FIELD_ORDER.get(right.field) ?? 99)
		if (fieldDelta !== 0) {
			return fieldDelta
		}
		return left.op.localeCompare(right.op)
	})

	return { clauses }
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

/**
 * 写入/替换某一 field 的 clause（同 field 其它 op 一并去掉）。
 * values 为空则删除该 field。
 */
export function setFilterFieldClause(
	query: FilterQuery,
	field: FilterField,
	op: FilterOp,
	values: readonly string[],
): FilterQuery {
	const rest = query.clauses.filter((clause) => clause.field !== field)
	if (values.length === 0) {
		return normalizeFilterQuery({ clauses: rest })
	}
	return normalizeFilterQuery({
		clauses: [...rest, createFilterClause(field, op, values)],
	})
}

/** 去掉某一 field 的全部 clause */
export function removeFilterField(query: FilterQuery, field: FilterField): FilterQuery {
	return normalizeFilterQuery({
		clauses: query.clauses.filter((clause) => clause.field !== field),
	})
}

function normalizeClause(raw: unknown): FilterClause | null {
	if (!raw || typeof raw !== 'object') {
		return null
	}
	const record = raw as Partial<FilterClause>
	if (typeof record.field !== 'string' || !FIELD_SET.has(record.field)) {
		return null
	}
	if (typeof record.op !== 'string' || !OP_SET.has(record.op)) {
		return null
	}
	if (!Array.isArray(record.values)) {
		return null
	}

	const field = record.field as FilterField
	const op = record.op as FilterOp
	const cleaned = record.values
		.filter((value): value is string => typeof value === 'string' && value.length > 0)
		.map((value) => value.trim())
		.filter((value) => value.length > 0 && isAllowedValue(field, value))

	const unique = [...new Set(cleaned)]
	if (unique.length === 0) {
		return null
	}

	const id =
		typeof record.id === 'string' && record.id.length > 0 ? record.id : createFilterClauseId()

	return {
		id,
		field,
		op,
		values: sortValues(field, unique),
	}
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
	return values.toSorted((a, b) => a.localeCompare(b))
}

export function isFilterDateValue(value: string): value is FilterDateValue {
	return DATE_VALUE_SET.has(value)
}
