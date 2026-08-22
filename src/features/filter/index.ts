/**
 * @fileoverview **filter · 唯一对外公共面（`@/features/filter`）**
 *
 * FilterQuery 真源：临时 URL + View.filters；UI 为锚定 Menu/Bar。
 * 外模块：`import { … } from '@/features/filter'`
 */

// ── 领域核 ────────────────────────────────────────────────
export {
	createFilterClause,
	createFilterClauseId,
	decodeFilterQueryFromSearchParam,
	EMPTY_FILTER_QUERY,
	encodeFilterQueryToSearchParam,
	FILTER_DATE_VALUE_VALUES,
	FILTER_FIELD_VALUES,
	FILTER_OP_VALUES,
	FILTER_PROJECT_NONE_VALUE,
	FILTER_SEARCH_PARAM_KEY,
	filterQueriesEqual,
	isFilterDateValue,
	isFilterQueryEmpty,
	normalizeFilterQuery,
	removeFilterField,
	setFilterFieldClause,
	type FilterClause,
	type FilterDateValue,
	type FilterField,
	type FilterOp,
	type FilterQuery,
} from './core'

// ── 命令宿主注册槽（投影，非 Filter 真源） ────────────────
export {
	PageFilterProvider,
	usePageFilterContext,
	useRegisterPageFilterController,
} from './model/PageFilterProvider'

export type { PageFilterCapabilities, PageFilterController } from './model/PageFilterProvider'

export { registerFilterCommands } from './commands/registerFilterCommands'

export { useRegisterFilterCommandAdapter } from './model/useRegisterFilterCommandAdapter'

// ── UI ────────────────────────────────────────────────────
export { PageFilterButton } from './components/PageFilterButton'
export { FilterBar } from './components/FilterBar'
export { ListFilterUiProvider, type ListFilterUiValue } from './model/ListFilterUiContext'

export {
	parseListFilterSearch,
	useListFilterSession,
	type ListFilterSession,
	type UseListFilterSessionOptions,
} from './model/useListFilterSession'

export {
	emitFilterUiEvent,
	subscribeFilterUiEvent,
	type FilterUiEvent,
} from './model/filterUiEvents'
