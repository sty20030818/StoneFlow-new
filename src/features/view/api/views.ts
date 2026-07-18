import { invoke } from '@tauri-apps/api/core'

import type { Scope } from '@/shared/types'
import type {
	CreateViewInput,
	ReorderViewsInput,
	RunTaskViewInput,
	RunTaskViewResult,
	UpdateViewInput,
	View,
	ViewEntityType,
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

export async function listViews(entityType: ViewEntityType, visibleOnly = false) {
	return invoke<View[]>('list_views', {
		input: {
			entityType,
			visibleOnly,
		},
	})
}

export async function runTaskView(input: RunTaskViewInput) {
	return invoke<RunTaskViewResult>('run_task_view', {
		input: {
			scope: toScopePayload(input.scope),
			viewId: input.viewId ?? null,
			viewKey: input.viewKey ?? null,
			placement: input.placement
				? {
						kind: input.placement.kind,
						projectId:
							input.placement.kind === 'project' ? (input.placement.projectId ?? null) : null,
					}
				: null,
		},
	})
}

export async function createView(input: CreateViewInput) {
	return invoke<View>('create_view', {
		input: {
			entityType: input.entityType,
			name: input.name,
			description: input.description ?? null,
			filters: input.filters,
			sort: toSortPayload(input.sort),
			groupBy: input.groupBy ?? null,
		},
	})
}

export async function updateView(input: UpdateViewInput) {
	return invoke<View>('update_view', {
		input: {
			viewId: input.viewId,
			name: input.name,
			description: input.description,
			filters: input.filters,
			sort: input.sort ? toSortPayload(input.sort) : undefined,
			groupBy: input.groupBy,
		},
	})
}

export async function deleteView(viewId: string) {
	return invoke<void>('delete_view', {
		input: { viewId },
	})
}

export async function toggleViewVisible(viewId: string, visible: boolean) {
	return invoke<View>('toggle_view_visible', {
		input: { viewId, visible },
	})
}

export async function reorderViews(input: ReorderViewsInput) {
	return invoke<View[]>('reorder_views', {
		input: {
			entityType: input.entityType,
			orderedIds: input.orderedIds,
		},
	})
}
