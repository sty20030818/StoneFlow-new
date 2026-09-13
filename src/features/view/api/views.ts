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
	TaskViewContext,
	UpdateViewInput,
	View,
	ViewListItem,
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
	return records
		.map(toViewListItem)
		.filter((view) =>
			view.scope === null
				? scope.type === 'all'
				: view.scope.type === scope.type &&
					(scope.type === 'all' ||
						(view.scope.type === 'space' && view.scope.spaceId === scope.spaceId)),
		)
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
			order: input.order,
			dateBasis: input.dateBasis,
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
		items: result.items.map(toTaskQueryItem),
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

function toMetadata(value: Record<string, unknown>) {
	if (
		typeof value.id !== 'string' ||
		!value.id.trim() ||
		typeof value.name !== 'string' ||
		typeof value.position !== 'number' ||
		!Number.isSafeInteger(value.position) ||
		value.position < 0 ||
		typeof value.createdAt !== 'string' ||
		typeof value.updatedAt !== 'string'
	) {
		throw new Error('View 响应缺少可恢复的身份或元数据')
	}
	return {
		id: value.id,
		name: value.name,
		position: value.position,
		createdAt: value.createdAt,
		updatedAt: value.updatedAt,
	}
}

/** Library 逐条隔离定义错误；缺少可信身份的响应仍作为读取失败。 */
function toViewListItem(value: Record<string, unknown>): ViewListItem {
	const metadata = toMetadata(value)
	let scope: Scope | null = null
	try {
		scope = toScope(value.scope)
		return toView(value)
	} catch (error) {
		return {
			...metadata,
			scope,
			definitionError:
				typeof value.definitionError === 'string' && value.definitionError.length > 0
					? value.definitionError
					: error instanceof Error
						? error.message
						: '保存视图定义无法读取',
		}
	}
}

/** 写入和运行必须返回有效定义，不能降级成恢复记录或空筛选。 */
function toView(value: Record<string, unknown>): View {
	if (typeof value.definitionError === 'string' && value.definitionError.length > 0) {
		throw new Error(value.definitionError)
	}
	if (
		!value.filters ||
		typeof value.filters !== 'object' ||
		!Array.isArray((value.filters as FilterQuery).clauses)
	) {
		throw new Error('View 响应包含无效 filters')
	}
	return {
		...toMetadata(value),
		scope: toScope(value.scope),
		context: toContext(value.context),
		baseViewKey: toBaseViewKey(value.baseViewKey),
		filters: normalizeFilterQuery(value.filters as FilterQuery),
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

function toTaskQueryItem(value: Record<string, unknown>): RunTaskViewResult['items'][number] {
	return {
		group: value.group as RunTaskViewResult['items'][number]['group'],
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
