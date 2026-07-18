/**
 * global-search 对外公共面（`@/features/global-search`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/global-search'`。
 * 禁止深路径进 api/model/components/hooks。
 * 全局搜索输入、查询、结果导航与焦点 intent。
 */

export { searchEntities } from './api/searchEntities'

export { useGlobalSearch } from './model/useGlobalSearch'
export { useSearchFocusIntentStore } from './model/useSearchFocusIntentStore'
export { resolveProjectSearchTargetPath } from './model/searchNavigation'

/** Header 搜索框。 */
export { GlobalSearchInput } from './components/GlobalSearchInput'
