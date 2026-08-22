/**
 * View IPC：list / run / create / update / delete。
 * 产品真源：filters = FilterQuery；呈现 → display-options。
 */
import { invoke } from '@tauri-apps/api/core'

import { normalizeFilterQuery } from '@/features/filter'
import { EMPTY_FILTER_QUERY, type Scope } from '@/shared/types'
import type {
	CreateViewInput,
	FilterQuery,
	RunTaskViewInput,
	RunTaskViewResult,
	TaskViewContext,
	UpdateViewInput,
	View,
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

function toFiltersPayload(filters: FilterQuery) {
	return normalizeFilterQuery(filters)
}

export async function listViews(scope: Scope) {
	const records = await invoke<Array<Record<string, unknown>>>('list_views', {
		input: { scope: toScopePayload(scope) },
	})
	return records.map(toView)
}

export async function runTaskView(input: RunTaskViewInput): Promise<RunTaskViewResult> {
	const result = await invoke<{
		view: Record<string, unknown>
		items: Array<Record<string, unknown>>
		totalCount?: number | null
		nextCursor?: string | null
	}>('run_task_view', {
		input: {
			scope: toScopePayload(input.scope),
			viewId: input.viewId,
			filters: input.filters ? toFiltersPayload(input.filters) : undefined,
			cursor: input.cursor ?? null,
		},
	})
	if (input.cursor == null && typeof result.totalCount !== 'number') {
		throw new Error('run_task_view 响应缺少 totalCount')
	}
	if (result.totalCount != null && typeof result.totalCount !== 'number') {
		throw new Error('run_task_view 响应包含无效 totalCount')
	}
	return {
		view: toView(result.view),
		items: result.items.map(toTaskListItem),
		totalCount: result.totalCount ?? null,
		nextCursor: result.nextCursor ?? null,
	}
}

export async function createView(input: CreateViewInput) {
	const result = await invoke<Record<string, unknown>>('create_view', {
		input: {
			name: input.name,
			scope: toScopePayload(input.scope),
			context: input.context,
			baseViewKey: input.baseViewKey,
			filters: toFiltersPayload(input.filters),
		},
	})
	return toView(result)
}

export async function updateView(input: UpdateViewInput) {
	const result = await invoke<Record<string, unknown>>('update_view', {
		input: {
			viewId: input.viewId,
			name: input.name,
			scope: input.scope ? toScopePayload(input.scope) : undefined,
			context: input.context,
			baseViewKey: input.baseViewKey,
			filters: input.filters ? toFiltersPayload(input.filters) : undefined,
		},
	})
	return toView(result)
}

export async function deleteView(viewId: string) {
	return invoke<void>('delete_view', { viewId })
}

/** DTO → Saved View。 */
function toView(value: Record<string, unknown>): View {
	return {
		id: String(value.id),
		name: String(value.name),
		scope: toScope(value.scope),
		context: toContext(value.context),
		baseViewKey: toBaseViewKey(value.baseViewKey),
		filters: normalizeFilterQuery((value.filters as FilterQuery) ?? EMPTY_FILTER_QUERY),
		position: Number(value.position),
		createdAt: String(value.createdAt ?? ''),
		updatedAt: String(value.updatedAt ?? ''),
		definitionError:
			typeof value.definitionError === 'string' && value.definitionError.length > 0
				? value.definitionError
				: null,
	}
}

function toContext(value: unknown): TaskViewContext {
	const context = value as { kind?: unknown; projectId?: unknown } | null
	if (context?.kind === 'all') return { kind: 'all' }
	if (context?.kind === 'standalone') return { kind: 'standalone' }
	if (
		context?.kind === 'project' &&
		typeof context.projectId === 'string' &&
		context.projectId.length > 0
	) {
		return { kind: 'project', projectId: context.projectId }
	}
	throw new Error('View 响应包含无效 context')
}

function toScope(value: unknown): Scope {
	const scope = value as { type?: unknown; spaceId?: unknown } | null
	if (scope?.type === 'all') return { type: 'all' }
	if (scope?.type === 'space' && typeof scope.spaceId === 'string' && scope.spaceId.length > 0) {
		return { type: 'space', spaceId: scope.spaceId }
	}
	throw new Error('View 响应包含无效 scope')
}

function toBaseViewKey(value: unknown): View['baseViewKey'] {
	if (
		typeof value === 'string' &&
		['all', 'active', 'completed', 'today', 'upcoming'].includes(value)
	) {
		return value as View['baseViewKey']
	}
	throw new Error('View 响应包含无效 baseViewKey')
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
		canceledAt: value.canceledAt as string | null,
		archivedAt: value.archivedAt as string | null,
	}
}
