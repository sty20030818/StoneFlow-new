import type { EntityDetailDrawerTarget, EntityDetailParseResult } from './entityDetailTypes'

const TASK_QUERY_KEY = 'task'
const PROJECT_QUERY_KEY = 'project'

export function parseEntityDetailRouteState(search: string): EntityDetailParseResult {
	const params = new URLSearchParams(search)
	const taskId = normalizeEntityDetailId(params.get(TASK_QUERY_KEY))
	const hasInvalidProjectTarget = params.has(PROJECT_QUERY_KEY)

	if (taskId) {
		return {
			activeDetail: { kind: 'task', id: taskId },
			shouldCleanSearch: hasInvalidProjectTarget,
		}
	}

	return {
		activeDetail: null,
		shouldCleanSearch: params.has(TASK_QUERY_KEY) || hasInvalidProjectTarget,
	}
}

export function buildEntityDetailSearch(search: string, target: EntityDetailDrawerTarget): string {
	const params = new URLSearchParams(search)
	removeEntityDetailQuery(params)
	params.set(target.kind, target.id)
	return formatSearch(params)
}

export function clearEntityDetailSearch(search: string): string {
	const params = new URLSearchParams(search)
	removeEntityDetailQuery(params)
	return formatSearch(params)
}

export function normalizeEntityDetailId(value: string | null): string | null {
	const nextValue = value?.trim()
	return nextValue ? nextValue : null
}

function removeEntityDetailQuery(params: URLSearchParams) {
	params.delete(TASK_QUERY_KEY)
	params.delete(PROJECT_QUERY_KEY)
}

function formatSearch(params: URLSearchParams): string {
	const nextSearch = params.toString()
	return nextSearch ? `?${nextSearch}` : ''
}
