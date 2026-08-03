/**
 * Views 路由 search：只认临时筛选键 `f`。
 * sort/group 不进 URL；呈现只信 display-options。
 */
import { FILTER_SEARCH_PARAM_KEY, parseListFilterSearch } from '@/features/filter'

export type ViewSearchDefinition = {
	/** 透传 `f`，供 router 保留 URL 临时筛选 */
	f?: string
}

/**
 * 解析 Views 路由 search → 仅 `f`。
 * 与列表页 `parseListFilterSearch` 同一契约。
 */
export function parseViewSearch(search: Record<string, unknown>): ViewSearchDefinition {
	return parseListFilterSearch(search)
}

export { FILTER_SEARCH_PARAM_KEY }
