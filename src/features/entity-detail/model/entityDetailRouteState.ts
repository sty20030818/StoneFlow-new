import type { EntityDetailParseResult, EntityDetailTarget } from './entityDetailTypes'

const TASK_QUERY_KEY = 'task'
const PROJECT_QUERY_KEY = 'project'

export function parseEntityDetailRouteState(search: string): EntityDetailParseResult {
	const params = new URLSearchParams(search)
	const taskId = normalizeEntityDetailId(params.get(TASK_QUERY_KEY))
	const projectId = normalizeEntityDetailId(params.get(PROJECT_QUERY_KEY))

	if (taskId) {
		return {
			activeDetail: { kind: 'task', id: taskId },
			shouldCleanSearch: Boolean(projectId),
		}
	}

	if (projectId) {
		return {
			activeDetail: { kind: 'project', id: projectId },
			shouldCleanSearch: false,
		}
	}

	return {
		activeDetail: null,
		shouldCleanSearch: hasEntityDetailQuery(params),
	}
}

export function buildEntityDetailSearch(search: string, target: EntityDetailTarget): string {
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

function hasEntityDetailQuery(params: URLSearchParams): boolean {
	return params.has(TASK_QUERY_KEY) || params.has(PROJECT_QUERY_KEY)
}

function removeEntityDetailQuery(params: URLSearchParams) {
	params.delete(TASK_QUERY_KEY)
	params.delete(PROJECT_QUERY_KEY)
}

function formatSearch(params: URLSearchParams): string {
	const nextSearch = params.toString()
	return nextSearch ? `?${nextSearch}` : ''
}
