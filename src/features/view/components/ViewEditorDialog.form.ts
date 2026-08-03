import { z } from 'zod'

import {
	createFilterClause,
	FILTER_PROJECT_NONE_VALUE,
	normalizeFilterQuery,
	type FilterQuery,
} from '@/features/filter'
import type { CreateViewInput, TaskStatus, UpdateViewInput, View } from '@/shared/types'
import { EMPTY_FILTER_QUERY } from '@/shared/types'
import { titleString } from '@/shared/validation'

export type PriorityMode = 'any' | 'p4' | 'p3+' | 'p2+' | 'p1+'
type ProjectMode = 'any' | 'none' | 'specific'
/** 编辑器日期模式（映射到 FilterDateValue） */
type EditorDateMode = 'none' | 'today' | 'overdue' | 'future' | 'hasDate'

export const viewEditorSchema = z
	.object({
		name: titleString('视图名称'),
		statusList: z
			.array(
				z.enum(['todo', 'doing', 'waiting', 'done', 'canceled'] satisfies [
					TaskStatus,
					...TaskStatus[],
				]),
			)
			.min(1, '至少保留一个状态'),
		priorityMode: z.enum(['any', 'p4', 'p3+', 'p2+', 'p1+'] satisfies [
			PriorityMode,
			...PriorityMode[],
		]),
		projectMode: z.enum(['any', 'none', 'specific'] satisfies [ProjectMode, ...ProjectMode[]]),
		specificProjectId: z.string().trim(),
		dueMode: z.enum(['none', 'today', 'overdue', 'future', 'hasDate'] satisfies [
			EditorDateMode,
			...EditorDateMode[],
		]),
		plannedMode: z.enum(['none', 'today', 'overdue', 'future', 'hasDate'] satisfies [
			EditorDateMode,
			...EditorDateMode[],
		]),
	})
	.superRefine((values, ctx) => {
		if (values.projectMode === 'specific' && values.specificProjectId === 'none') {
			ctx.addIssue({
				code: 'custom',
				path: ['specificProjectId'],
				message: '请选择一个项目',
			})
		}
	})

export type ViewEditorFormValues = z.infer<typeof viewEditorSchema>

export function buildViewEditorDefaultValues(view: View | null): ViewEditorFormValues {
	const filters = normalizeFilterQuery(view?.filters ?? EMPTY_FILTER_QUERY)

	return {
		name: view?.name ?? '',
		statusList: readStatusList(filters),
		priorityMode: readPriorityMode(filters),
		projectMode: readProjectMode(filters).mode,
		specificProjectId: readProjectMode(filters).projectId,
		dueMode: readDateMode(filters, 'due'),
		plannedMode: readDateMode(filters, 'planned'),
	}
}

export function toCreateViewInput(values: ViewEditorFormValues): CreateViewInput {
	return {
		name: values.name.trim(),
		scope: { type: 'all' },
		filters: buildViewFilters(values),
	}
}

export function toUpdateViewInput(values: ViewEditorFormValues, viewId: string): UpdateViewInput {
	return {
		viewId,
		name: values.name.trim(),
		filters: buildViewFilters(values),
	}
}

function buildViewFilters(values: ViewEditorFormValues): FilterQuery {
	const clauses = []

	if (values.statusList.length > 0) {
		clauses.push(createFilterClause('status', 'is', values.statusList))
	}

	const priorityValues = priorityModeToValues(values.priorityMode)
	if (priorityValues) {
		clauses.push(createFilterClause('priority', 'is', priorityValues))
	}

	if (values.projectMode === 'none') {
		clauses.push(createFilterClause('project', 'is', [FILTER_PROJECT_NONE_VALUE]))
	} else if (values.projectMode === 'specific' && values.specificProjectId !== 'none') {
		clauses.push(createFilterClause('project', 'is', [values.specificProjectId]))
	}

	const dueValue = editorDateToFilterValue(values.dueMode)
	if (dueValue) {
		clauses.push(createFilterClause('due', 'is', [dueValue]))
	}
	const plannedValue = editorDateToFilterValue(values.plannedMode)
	if (plannedValue) {
		clauses.push(createFilterClause('planned', 'is', [plannedValue]))
	}

	return normalizeFilterQuery({ clauses })
}

function readStatusList(filters: FilterQuery): TaskStatus[] {
	const clause = filters.clauses.find((c) => c.field === 'status' && c.op === 'is')
	if (!clause || clause.values.length === 0) {
		return ['todo', 'doing', 'waiting']
	}
	return clause.values.filter((v): v is TaskStatus =>
		['todo', 'doing', 'waiting', 'done', 'canceled'].includes(v),
	)
}

function readPriorityMode(filters: FilterQuery): PriorityMode {
	const clause = filters.clauses.find((c) => c.field === 'priority' && c.op === 'is')
	if (!clause || clause.values.length === 0) return 'any'
	const nums = new Set(clause.values.map(Number))
	if (nums.size === 1 && nums.has(4)) return 'p4'
	if ([3, 4].every((n) => nums.has(n)) && nums.size === 2) return 'p3+'
	if ([2, 3, 4].every((n) => nums.has(n)) && nums.size === 3) return 'p2+'
	if ([1, 2, 3, 4].every((n) => nums.has(n))) return 'p1+'
	if (nums.has(4) && !nums.has(0)) return 'p3+' // 近似
	return 'any'
}

function priorityModeToValues(mode: PriorityMode): string[] | null {
	switch (mode) {
		case 'p4':
			return ['4']
		case 'p3+':
			return ['4', '3']
		case 'p2+':
			return ['4', '3', '2']
		case 'p1+':
			return ['4', '3', '2', '1']
		default:
			return null
	}
}

function readProjectMode(filters: FilterQuery): { mode: ProjectMode; projectId: string } {
	const clause = filters.clauses.find((c) => c.field === 'project' && c.op === 'is')
	if (!clause) return { mode: 'any', projectId: 'none' }
	if (clause.values.includes(FILTER_PROJECT_NONE_VALUE)) {
		return { mode: 'none', projectId: 'none' }
	}
	if (clause.values[0]) {
		return { mode: 'specific', projectId: clause.values[0] }
	}
	return { mode: 'any', projectId: 'none' }
}

function readDateMode(filters: FilterQuery, field: 'due' | 'planned'): EditorDateMode {
	const clause = filters.clauses.find((c) => c.field === field && c.op === 'is')
	const v = clause?.values[0]
	if (!v) return 'none'
	if (v === 'today') return 'today'
	if (v === 'overdue') return 'overdue'
	if (v === 'hasDate') return 'hasDate'
	if (v === 'tomorrow' || v === 'thisWeek') return 'future'
	return 'none'
}

function editorDateToFilterValue(mode: EditorDateMode): string | null {
	switch (mode) {
		case 'today':
			return 'today'
		case 'overdue':
			return 'overdue'
		case 'future':
			return 'tomorrow'
		case 'hasDate':
			return 'hasDate'
		default:
			return null
	}
}
