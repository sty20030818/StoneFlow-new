/**
 * @fileoverview **global-search · 唯一对外公共面（`@/features/global-search`）**
 *
 * 全局搜索输入、查询、结果导航与焦点 intent。
 *
 * 外模块：`import { … } from '@/features/global-search'`
 * 禁止：`@/features/global-search/api|model|components|…`
 */

export type { SearchEntitiesInput } from './api/searchEntities'
export { searchEntities } from './api/searchEntities'

export { useSearchEntitiesQuery, searchKeys } from './hooks'

export { useGlobalSearch } from './model/useGlobalSearch'
export {
	useSearchFocusIntentStore,
	selectSearchFocusRequestVersion,
} from './model/useSearchFocusIntentStore'
export {
	resolveProjectSearchTargetPath,
	resolveTaskSearchTargetPath,
} from './model/searchNavigation'

/** Header 搜索框。 */
export { GlobalSearchInput } from './components/GlobalSearchInput'
export { GlobalSearchResults } from './components/GlobalSearchResults'
