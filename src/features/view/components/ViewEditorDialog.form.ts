import { z } from 'zod'

import type {
	CreateViewInput,
	TaskGroupBy,
	TaskStatus,
	TaskViewFilters,
	UpdateViewInput,
	View,
	ViewSortField,
	ViewSortRule,
} from '@/shared/types'
import { titleString } from '@/shared/validation'

export type PriorityMode = 'any' | 'p4' | 'p3+' | 'p2+' | 'p1+'
type ProjectMode = 'any' | 'none' | 'specific'

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
		dueMode: z.enum([
			'none',
			'today',
			'overdue',
			'future',
			'past',
			'between',
			'not_none',
		] satisfies [
			NonNullable<TaskViewFilters['due']>['mode'],
			...NonNullable<TaskViewFilters['due']>['mode'][],
		]),
		plannedMode: z.enum([
			'none',
			'today',
			'overdue',
			'future',
			'past',
			'between',
			'not_none',
		] satisfies [
			NonNullable<TaskViewFilters['planned']>['mode'],
			...NonNullable<TaskViewFilters['planned']>['mode'][],
		]),
		groupBy: z.enum(['none', 'status', 'priority', 'project', 'due', 'planned'] satisfies [
			TaskGroupBy,
			...TaskGroupBy[],
		]),
		sortField: z.enum([
			'position',
			'priority',
			'dueAt',
			'plannedAt',
			'createdAt',
			'updatedAt',
			'completedAt',
		] satisfies [ViewSortField, ...ViewSortField[]]),
		sortDirection: z.enum(['asc', 'desc'] satisfies [
			ViewSortRule['direction'],
			...ViewSortRule['direction'][],
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
	const filters = getInitialFilters(view)
	const firstSortRule = view?.sort[0] ?? { field: 'updatedAt', direction: 'desc' as const }

	return {
		name: view?.name ?? '',
		statusList: filters.status ?? ['todo', 'doing', 'waiting'],
		priorityMode: getPriorityMode(filters),
		projectMode: filters.project?.mode ?? 'any',
		specificProjectId: filters.project?.ids?.[0] ?? 'none',
		dueMode: filters.due?.mode ?? 'none',
		plannedMode: filters.planned?.mode ?? 'none',
		groupBy: view?.groupBy ?? 'none',
		sortField: firstSortRule.field,
		sortDirection: firstSortRule.direction,
	}
}

export function toCreateViewInput(values: ViewEditorFormValues): CreateViewInput {
	return {
		name: values.name.trim(),
		scope: { type: 'all' },
		filters: buildViewFilters(values),
		sort: [{ field: values.sortField, direction: values.sortDirection }],
		groupBy: values.groupBy,
	}
}

export function toUpdateViewInput(values: ViewEditorFormValues, viewId: string): UpdateViewInput {
	return {
		viewId,
		name: values.name.trim(),
		filters: buildViewFilters(values),
		sort: [{ field: values.sortField, direction: values.sortDirection }],
		groupBy: values.groupBy,
	}
}

function getInitialFilters(view: View | null): TaskViewFilters {
	const filters = (view?.filters ?? {}) as TaskViewFilters
	return {
		status: filters.status ?? ['todo', 'doing', 'waiting'],
		priority: filters.priority,
		project: filters.project,
		due: filters.due,
		planned: filters.planned,
		created: filters.created,
		updated: filters.updated,
		completed: filters.completed,
	}
}

function getPriorityMode(filters: TaskViewFilters): PriorityMode {
	const priority = filters.priority
	if (!priority) return 'any'
	if (priority.eq === 4) return 'p4'
	if (priority.gte === 3) return 'p3+'
	if (priority.gte === 2) return 'p2+'
	if (priority.gte === 1) return 'p1+'
	return 'any'
}

function buildPriorityFilter(mode: PriorityMode): TaskViewFilters['priority'] | undefined {
	switch (mode) {
		case 'p4':
			return { eq: 4 }
		case 'p3+':
			return { gte: 3 }
		case 'p2+':
			return { gte: 2 }
		case 'p1+':
			return { gte: 1 }
		default:
			return undefined
	}
}

function buildViewFilters(values: ViewEditorFormValues): TaskViewFilters {
	return {
		status: values.statusList,
		priority: buildPriorityFilter(values.priorityMode),
		project:
			values.projectMode === 'any'
				? undefined
				: values.projectMode === 'none'
					? { mode: 'none' }
					: {
							mode: 'specific',
							ids: values.specificProjectId !== 'none' ? [values.specificProjectId] : [],
						},
		due: values.dueMode === 'none' ? undefined : { mode: values.dueMode },
		planned: values.plannedMode === 'none' ? undefined : { mode: values.plannedMode },
	}
}
