import { z } from 'zod'

import { createFilterClause, normalizeFilterQuery, type FilterQuery } from '@/features/filter'
import type { CreateViewInput, TaskStatus, UpdateViewInput, View } from '@/shared/types'
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
export type CreateViewDraft = Omit<CreateViewInput, 'scope'>

export function buildViewEditorDefaultValues(view: View | null): ViewEditorFormValues {
	return {
		name: view?.name ?? '',
		statusList: ['todo', 'doing', 'waiting'],
		priorityMode: 'any',
		projectMode: 'any',
		specificProjectId: 'none',
		dueMode: 'none',
		plannedMode: 'none',
	}
}

export function toCreateViewDraft(values: ViewEditorFormValues): CreateViewDraft {
	return {
		name: values.name.trim(),
		context:
			values.projectMode === 'none'
				? { kind: 'standalone' }
				: values.projectMode === 'specific'
					? { kind: 'project', projectId: values.specificProjectId }
					: { kind: 'all' },
		baseViewKey: 'all',
		filters: buildViewFilters(values),
	}
}

export function toUpdateViewInput(values: ViewEditorFormValues, viewId: string): UpdateViewInput {
	return {
		viewId,
		name: values.name.trim(),
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

function editorDateToFilterValue(mode: EditorDateMode): string | null {
	switch (mode) {
		case 'today':
			return 'today'
		case 'overdue':
			return 'overdue'
		case 'future':
			return 'future'
		case 'hasDate':
			return 'hasDate'
		default:
			return null
	}
}
