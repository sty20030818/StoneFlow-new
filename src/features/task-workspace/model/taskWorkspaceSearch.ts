import { parseListFilterSearch } from '@/features/filter'

import { DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY } from './useDefaultTaskViewSelection'

export function parseTaskWorkspaceSearch(search: Record<string, unknown>) {
	const parsed = parseListFilterSearch(search)
	const viewKey = search[DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY]
	return typeof viewKey === 'string' && viewKey.length > 0
		? { ...parsed, [DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY]: viewKey }
		: parsed
}
