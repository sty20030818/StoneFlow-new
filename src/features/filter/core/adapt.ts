/**
 * FilterQuery → 现有 list / view 查询输入的唯一适配出口。
 * 禁止 UI / scene 内复制映射逻辑。
 */

import type { ListTasksDateFilter, TaskStatus, TaskViewFilters } from '@/shared/types'

import { isFilterDateValue, normalizeFilterQuery } from './normalize'
import {
	FILTER_PROJECT_NONE_VALUE,
	type FilterClause,
	type FilterDateValue,
	type FilterQuery,
} from './types'

const ALL_TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'waiting', 'done', 'canceled']
const ALL_PRIORITIES = [0, 1, 2, 3, 4] as const

/**
 * list_tasks 可消费的筛选切片（由 scene 合并进 ListTasksInput / placement）。
 */
export type ListTasksFilterPatch = {
	/** 省略 = 不限 status */
	statuses?: TaskStatus[]
	/** 省略 = 不限 priority */
	priorities?: number[]
	dateFilter?: ListTasksDateFilter | null
	/**
	 * project 下推：
	 * - specific：单 id（多 id 时取第一个，其余留给后续 query 增强）
	 * - none：无项目
	 * - 未设：不限制 project
	 */
	project?: { mode: 'specific'; projectId: string } | { mode: 'none' }
}

/**
 * 将 FilterQuery 适配为 list 查询补丁。
 * @param now 可选「现在」，便于日期 range 单测注入
 */
export function adaptFilterQueryToListTasks(
	query: FilterQuery,
	now: Date = new Date(),
): ListTasksFilterPatch {
	const normalized = normalizeFilterQuery(query)
	const patch: ListTasksFilterPatch = {}

	const statusClause = findClause(normalized, 'status')
	if (statusClause) {
		const statuses = resolveStatusValues(statusClause)
		if (statuses) {
			patch.statuses = statuses
		}
	}

	const priorityClause = findClause(normalized, 'priority')
	if (priorityClause) {
		const priorities = resolvePriorityValues(priorityClause)
		if (priorities) {
			patch.priorities = priorities
		}
	}

	// list 仅一条 dateFilter：优先 due，否则 planned（与历史 page 单日期维一致）
	const dueClause = findClause(normalized, 'due')
	const plannedClause = findClause(normalized, 'planned')
	const dateClause = dueClause ?? plannedClause
	if (dateClause && dateClause.op === 'is' && dateClause.values[0]) {
		const dateValue = dateClause.values[0]
		if (isFilterDateValue(dateValue)) {
			const encoded = encodeDateValueToListFilter(dateValue, now)
			if (encoded) {
				patch.dateFilter = encoded
			}
		}
	}

	const projectClause = findClause(normalized, 'project')
	if (projectClause && projectClause.op === 'is') {
		if (projectClause.values.includes(FILTER_PROJECT_NONE_VALUE)) {
			patch.project = { mode: 'none' }
		} else if (projectClause.values[0]) {
			patch.project = { mode: 'specific', projectId: projectClause.values[0] }
		}
	}

	return patch
}

/**
 * 适配为当前后端仍接受的 TaskViewFilters 覆盖形状（T4 前过渡出口；
 * T4 完成后应改为直接传 FilterQuery，本函数可删或改为 identity）。
 */
export function adaptFilterQueryToViewFilters(query: FilterQuery): TaskViewFilters {
	const normalized = normalizeFilterQuery(query)
	const filters: TaskViewFilters = {}

	const statusClause = findClause(normalized, 'status')
	if (statusClause) {
		const statuses = resolveStatusValues(statusClause)
		if (statuses && statuses.length > 0) {
			filters.status = statuses
		}
	}

	const priorityClause = findClause(normalized, 'priority')
	if (priorityClause && priorityClause.op === 'is' && priorityClause.values.length === 1) {
		const eq = Number(priorityClause.values[0])
		if (eq >= 0 && eq <= 4) {
			filters.priority = { eq: eq as 0 | 1 | 2 | 3 | 4 }
		}
	} else if (priorityClause && priorityClause.op === 'is' && priorityClause.values.length > 1) {
		// 多值 is：用 gte/lte 无法表达任意集合；暂取最高优先（数值最大）为 eq 近似
		// 完整多值待后端 clause 原生支持（T4+）
		const nums = priorityClause.values.map(Number).filter((n) => n >= 0 && n <= 4)
		if (nums.length > 0) {
			const max = Math.max(...nums) as 0 | 1 | 2 | 3 | 4
			filters.priority = { eq: max }
		}
	}

	const projectClause = findClause(normalized, 'project')
	if (projectClause && projectClause.op === 'is') {
		if (projectClause.values.includes(FILTER_PROJECT_NONE_VALUE)) {
			filters.project = { mode: 'none', ids: [] }
		} else if (projectClause.values.length > 0) {
			filters.project = { mode: 'specific', ids: [...projectClause.values] }
		}
	}

	const dueClause = findClause(normalized, 'due')
	if (dueClause && dueClause.op === 'is' && dueClause.values[0] && isFilterDateValue(dueClause.values[0])) {
		const mode = mapDateValueToViewMode(dueClause.values[0])
		if (mode) {
			filters.due = { mode }
		}
	}

	const plannedClause = findClause(normalized, 'planned')
	if (
		plannedClause &&
		plannedClause.op === 'is' &&
		plannedClause.values[0] &&
		isFilterDateValue(plannedClause.values[0])
	) {
		const mode = mapDateValueToViewMode(plannedClause.values[0])
		if (mode) {
			filters.planned = { mode }
		}
	}

	return filters
}

function findClause(query: FilterQuery, field: FilterClause['field']): FilterClause | undefined {
	return query.clauses.find((clause) => clause.field === field)
}

function resolveStatusValues(clause: FilterClause): TaskStatus[] | undefined {
	const selected = clause.values.filter((value): value is TaskStatus =>
		ALL_TASK_STATUSES.includes(value as TaskStatus),
	)
	if (selected.length === 0) {
		return undefined
	}
	if (clause.op === 'is') {
		return selected
	}
	// is_not → 补集白名单（list_tasks 仅支持 include）
	const excluded = new Set(selected)
	const complement = ALL_TASK_STATUSES.filter((status) => !excluded.has(status))
	return complement.length > 0 ? complement : undefined
}

function resolvePriorityValues(clause: FilterClause): number[] | undefined {
	const selected = clause.values
		.map(Number)
		.filter((n) => n >= 0 && n <= 4)
	if (selected.length === 0) {
		return undefined
	}
	if (clause.op === 'is') {
		return selected.toSorted((a, b) => b - a)
	}
	const excluded = new Set(selected)
	const complement = ALL_PRIORITIES.filter((p) => !excluded.has(p))
	return complement.length > 0 ? [...complement] : undefined
}

function encodeDateValueToListFilter(
	dateValue: FilterDateValue,
	now: Date,
): ListTasksDateFilter | null {
	if (dateValue === 'hasDate') {
		return { mode: 'hasDate' }
	}
	if (dateValue === 'noDate') {
		return { mode: 'noDate' }
	}

	const today = startOfLocalDay(now)
	const tomorrow = addLocalDays(today, 1)
	const endOfWeek = getEndOfLocalWeek(today)

	switch (dateValue) {
		case 'today':
			return { mode: 'range', from: toStartIso(today), to: toEndIso(today) }
		case 'tomorrow':
			return { mode: 'range', from: toStartIso(tomorrow), to: toEndIso(tomorrow) }
		case 'thisWeek':
			return { mode: 'range', from: toStartIso(today), to: toEndIso(endOfWeek) }
		case 'overdue':
			return {
				mode: 'range',
				from: null,
				to: toEndIso(addLocalDays(today, -1)),
			}
		default:
			return null
	}
}

function mapDateValueToViewMode(
	value: FilterDateValue,
): NonNullable<TaskViewFilters['due']>['mode'] | null {
	switch (value) {
		case 'today':
			return 'today'
		case 'overdue':
			return 'overdue'
		case 'hasDate':
			return 'not_none'
		case 'noDate':
			return 'none'
		case 'tomorrow':
		case 'thisWeek':
			// View DateFilterMode 无 tomorrow/thisWeek：降级为 future（近似）
			return 'future'
		default:
			return null
	}
}

function startOfLocalDay(date: Date) {
	return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function addLocalDays(date: Date, days: number) {
	const next = new Date(date)
	next.setDate(next.getDate() + days)
	return next
}

function getEndOfLocalWeek(date: Date) {
	const day = date.getDay()
	const daysUntilSunday = (7 - day) % 7
	return addLocalDays(date, daysUntilSunday)
}

function toStartIso(day: Date) {
	return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 0, 0, 0, 0).toISOString()
}

function toEndIso(day: Date) {
	return new Date(day.getFullYear(), day.getMonth(), day.getDate(), 23, 59, 59, 999).toISOString()
}
