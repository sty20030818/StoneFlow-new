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
import { optionalTrimmedString, titleString } from '@/shared/validation'

export type InboxMode = 'any' | 'inbox' | 'notInbox'
export type PriorityMode = 'any' | 'p4' | 'p3+' | 'p2+' | 'p1+'
type ProjectMode = 'any' | 'none' | 'specific'

export const viewEditorSchema = z
	.object({
		name: titleString('视图名称'),
		description: optionalTrimmedString,
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
		inboxMode: z.enum(['any', 'inbox', 'notInbox'] satisfies [InboxMode, ...InboxMode[]]),
		projectMode: z.enum(['any', 'none', 'specific'] satisfies [ProjectMode, ...ProjectMode[]]),
		specificProjectId: z.string().trim(),
		dueMode: z.enum([
			'none',
			'today',
			'tomorrow',
			'this_week',
			'next_week',
			'overdue',
			'future',
			'past',
			'between',
			'not_none',
		] satisfies [
			NonNullable<TaskViewFilters['due']>['mode'],
			...NonNullable<TaskViewFilters['due']>['mode'][],
		]),
		scheduledMode: z.enum([
			'none',
			'today',
			'tomorrow',
			'this_week',
			'next_week',
			'overdue',
			'future',
			'past',
			'between',
			'not_none',
		] satisfies [
			NonNullable<TaskViewFilters['scheduled']>['mode'],
			...NonNullable<TaskViewFilters['scheduled']>['mode'][],
		]),
		groupBy: z.enum(['none', 'status', 'priority', 'project', 'due', 'scheduled'] satisfies [
			TaskGroupBy,
			...TaskGroupBy[],
		]),
		sortField: z.enum([
			'sortOrder',
			'priority',
			'dueAt',
			'scheduledAt',
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
		description: view?.description ?? '',
		statusList: filters.status ?? ['todo', 'doing', 'waiting'],
		priorityMode: getPriorityMode(filters),
		inboxMode: getInboxMode(filters),
		projectMode: filters.project?.mode ?? 'any',
		specificProjectId: filters.project?.ids?.[0] ?? 'none',
		dueMode: filters.due?.mode ?? 'none',
		scheduledMode: filters.scheduled?.mode ?? 'none',
		groupBy: view?.groupBy ?? 'none',
		sortField: firstSortRule.field,
		sortDirection: firstSortRule.direction,
	}
}

export function toCreateViewInput(values: ViewEditorFormValues): CreateViewInput {
	return {
		entityType: 'task',
		name: values.name.trim(),
		description: values.description?.trim() ? values.description.trim() : null,
		filters: buildViewFilters(values),
		sort: [{ field: values.sortField, direction: values.sortDirection }],
		groupBy: values.groupBy,
	}
}

export function toUpdateViewInput(values: ViewEditorFormValues, viewId: string): UpdateViewInput {
	return {
		viewId,
		name: values.name.trim(),
		description: values.description?.trim() ? values.description.trim() : null,
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
		inbox: filters.inbox,
		project: filters.project,
		due: filters.due,
		scheduled: filters.scheduled,
		created: filters.created,
		updated: filters.updated,
		completed: filters.completed,
		archived: filters.archived ?? false,
		deleted: filters.deleted ?? false,
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

function getInboxMode(filters: TaskViewFilters): InboxMode {
	if (filters.inbox === true) return 'inbox'
	if (filters.inbox === false) return 'notInbox'
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
		inbox: values.inboxMode === 'any' ? undefined : values.inboxMode === 'inbox',
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
		scheduled: values.scheduledMode === 'none' ? undefined : { mode: values.scheduledMode },
		archived: false,
		deleted: false,
	}
}
