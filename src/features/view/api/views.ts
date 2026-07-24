import { invoke } from '@tauri-apps/api/core'

import type { Scope } from '@/shared/types'
import type {
	CreateViewInput,
	RunTaskViewInput,
	RunTaskViewResult,
	SystemViewKey,
	UpdateViewInput,
	View,
	ViewSortRule,
} from '@/shared/types'

type ScopePayload =
	| {
			type: 'all'
	  }
	| {
			type: 'space'
			spaceId: string
	  }

function toScopePayload(scope: Scope): ScopePayload {
	return scope.type === 'all' ? { type: 'all' } : { type: 'space', spaceId: scope.spaceId }
}

function toSortPayload(sort: ViewSortRule[]) {
	return sort.map((rule) => ({
		field: rule.field,
		direction: rule.direction,
	}))
}

export async function listViews() {
	const custom = await invoke<Array<Record<string, unknown>>>('list_views', { input: {} })
	return [...SYSTEM_VIEWS, ...custom.map(toCustomView)]
}

export async function runTaskView(input: RunTaskViewInput) {
	const key =
		SYSTEM_VIEWS.find((view) => view.id === input.viewId)?.systemKey ?? input.viewKey ?? null
	const result = await invoke<{
		view: Record<string, unknown> | null
		items: Array<Record<string, unknown>>
		groups: RunTaskViewResult['groups']
	}>('run_task_view', {
		input: {
			scope: toScopePayload(input.scope),
			viewId: key ? null : (input.viewId ?? null),
			viewKey: key,
			filters: input.filters,
			sort: input.sort ? toSortPayload(input.sort) : undefined,
			groupBy: input.groupBy ?? undefined,
		},
	})
	return {
		view: result.view
			? toCustomView(result.view)
			: SYSTEM_VIEWS.find((view) => view.systemKey === key)!,
		items: result.items.map(toTaskListItem),
		groups: result.groups,
	}
}

export async function createView(input: CreateViewInput) {
	const result = await invoke<Record<string, unknown>>('create_view', {
		input: {
			name: input.name,
			scope: toScopePayload(input.scope),
			filters: input.filters,
			sort: toSortPayload(input.sort),
			groupBy: input.groupBy,
		},
	})
	return toCustomView(result)
}

export async function updateView(input: UpdateViewInput) {
	const result = await invoke<Record<string, unknown>>('update_view', {
		input: {
			viewId: input.viewId,
			name: input.name,
			scope: input.scope ? toScopePayload(input.scope) : undefined,
			filters: input.filters,
			sort: input.sort ? toSortPayload(input.sort) : undefined,
			groupBy: input.groupBy,
		},
	})
	return toCustomView(result)
}

export async function deleteView(viewId: string) {
	return invoke<void>('delete_view', { viewId })
}

const SYSTEM_VIEWS: View[] = [
	['all', '全部任务'],
	['active', '待处理'],
	['today', '今天'],
	['upcoming', '即将到期'],
	['overdue', '已逾期'],
].map(([key, name], position) => ({
	id: key,
	systemKey: key as SystemViewKey,
	name,
	kind: 'system',
	scope: { type: 'all' },
	filters: {},
	sort: [],
	groupBy: 'none',
	position,
	createdAt: '',
	updatedAt: '',
}))

function toCustomView(value: Record<string, unknown>): View {
	return {
		id: String(value.id),
		name: String(value.name),
		kind: 'custom',
		systemKey: null,
		scope: toScope(value.scope),
		filters: (value.filters ?? {}) as View['filters'],
		sort: (value.sort ?? []) as View['sort'],
		groupBy: (value.groupBy as View['groupBy']) ?? 'none',
		position: Number(value.position),
		createdAt: String(value.createdAt ?? ''),
		updatedAt: String(value.updatedAt ?? ''),
	}
}

function toScope(value: unknown): Scope {
	const scope = value as { type?: unknown; spaceId?: unknown } | null
	return scope?.type === 'space' && typeof scope.spaceId === 'string'
		? { type: 'space', spaceId: scope.spaceId }
		: { type: 'all' }
}

function toTaskListItem(value: Record<string, unknown>): RunTaskViewResult['items'][number] {
	return {
		...value,
		id: String(value.id),
		spaceId: String(value.spaceId),
		spaceName: String(value.spaceName),
		spaceSlug: String(value.spaceSlug),
		projectId: value.projectId as string | null,
		projectName: value.projectName as string | null,
		title: String(value.title),
		note: value.note as string | null,
		status: value.status as RunTaskViewResult['items'][number]['status'],
		statusChangedAt: String(value.statusChangedAt),
		priority: Number(value.priority) as RunTaskViewResult['items'][number]['priority'],
		plannedAt: value.plannedAt as string | null,
		dueAt: value.dueAt as string | null,
		remindAt: value.remindAt as string | null,
		completedAt: value.completedAt as string | null,
		createdAt: String(value.createdAt),
		updatedAt: String(value.updatedAt),

		canceledAt: null,
		archivedAt: null,
	}
}
