/**
 * View IPC：list / run / create / update / delete。
 * 产品真源：filters = FilterQuery；呈现 → display-options。
 */
import { invoke } from '@tauri-apps/api/core'

import { normalizeFilterQuery } from '@/features/filter'
import type { Scope } from '@/shared/types'
import type {
	CreateViewInput,
	FilterQuery,
	RunTaskViewInput,
	RunTaskViewResult,
	SystemViewKey,
	UpdateViewInput,
	View,
} from '@/shared/types'
import { EMPTY_FILTER_QUERY } from '@/shared/types'

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

function toFiltersPayload(filters: FilterQuery) {
	return normalizeFilterQuery(filters)
}

export async function listViews() {
	const custom = await invoke<Array<Record<string, unknown>>>('list_views', { input: {} })
	return [...SYSTEM_VIEWS, ...custom.map(toCustomView)]
}

/**
 * 列出自定义 View 的 raw 行（含可能残留的 sort/group），仅 migrate 使用。
 */
export async function listCustomViewRawRecords(): Promise<Array<Record<string, unknown>>> {
	return invoke<Array<Record<string, unknown>>>('list_views', { input: {} })
}

export async function runTaskView(input: RunTaskViewInput): Promise<RunTaskViewResult> {
	const key =
		SYSTEM_VIEWS.find((view) => view.id === input.viewId)?.systemKey ?? input.viewKey ?? null
	const result = await invoke<{
		view: Record<string, unknown> | null
		items: Array<Record<string, unknown>>
		groups: RunTaskViewResult['groups']
		totalCount?: number
		nextCursor?: string | null
	}>('run_task_view', {
		input: {
			scope: toScopePayload(input.scope),
			viewId: key ? null : (input.viewId ?? null),
			viewKey: key,
			filters: input.filters ? toFiltersPayload(input.filters) : undefined,
			limit: input.limit ?? null,
			cursor: input.cursor ?? null,
		},
	})
	if (typeof result.totalCount !== 'number') {
		throw new Error('run_task_view 响应缺少 totalCount')
	}
	return {
		view: result.view
			? toCustomView(result.view)
			: SYSTEM_VIEWS.find((view) => view.systemKey === key)!,
		items: result.items.map(toTaskListItem),
		groups: result.groups,
		totalCount: result.totalCount,
		nextCursor: result.nextCursor ?? null,
	}
}

export async function createView(input: CreateViewInput) {
	const result = await invoke<Record<string, unknown>>('create_view', {
		input: {
			name: input.name,
			scope: toScopePayload(input.scope),
			filters: toFiltersPayload(input.filters),
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
			filters: input.filters ? toFiltersPayload(input.filters) : undefined,
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
	kind: 'system' as const,
	scope: { type: 'all' as const },
	filters: EMPTY_FILTER_QUERY,
	position,
	createdAt: '',
	updatedAt: '',
}))

/** DTO → 产品 View（不带 sort/group） */
function toCustomView(value: Record<string, unknown>): View {
	return {
		id: String(value.id),
		name: String(value.name),
		kind: 'custom',
		systemKey: null,
		scope: toScope(value.scope),
		filters: normalizeFilterQuery((value.filters as FilterQuery) ?? EMPTY_FILTER_QUERY),
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
		id: String(value.id),
		spaceId: String(value.spaceId),
		spaceName: String(value.spaceName),
		spaceSlug: String(value.spaceSlug),
		projectId: value.projectId as string | null,
		projectName: value.projectName as string | null,
		title: String(value.title),
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
