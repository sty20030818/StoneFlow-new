/**
 * @fileoverview **filter · 唯一对外公共面（`@/features/filter`）**
 *
 * FilterQuery 真源：临时 URL + View.filters；UI 为锚定 Menu/Bar。
 * 外模块：`import { … } from '@/features/filter'`
 */

// ── 领域核 ────────────────────────────────────────────────
export {
	adaptFilterQueryToListTasks,
	adaptFilterQueryToViewFilters,
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
	mergeFilterQueryIntoSearch,
	normalizeFilterQuery,
	readFilterQueryFromSearch,
	type FilterClause,
	type FilterDateValue,
	type FilterField,
	type FilterOp,
	type FilterQuery,
	type ListTasksFilterPatch,
} from './core'

// ── 命令宿主注册槽 ────────────────────────────────────────
export {
	PageFilterProvider,
	usePageFilterContext,
	useRegisterPageFilterController,
	hasTaskDate,
	isTaskCompleted,
	resolveTaskDateValue,
} from './model/PageFilterProvider'

export type {
	PageDateFilterValue,
	PageFilterApplyInput,
	PageFilterCapabilities,
	PageFilterController,
	PageFilterKind,
	PageFilterState,
} from './model/PageFilterProvider'

export { registerFilterCommands } from './commands/registerFilterCommands'

export {
	filterQueryToCommandProjection,
	useRegisterFilterCommandAdapter,
} from './model/useRegisterFilterCommandAdapter'

// ── UI ────────────────────────────────────────────────────
export { PageFilterButton } from './components/PageFilterButton'
export { FilterBar } from './components/FilterBar'
export { FilterMenu } from './components/FilterMenu'
export {
	ListFilterUiProvider,
	useListFilterUi,
	type FilterProjectOption,
	type ListFilterUiValue,
} from './model/ListFilterUiContext'

export {
	parseListFilterSearch,
	useListFilterSession,
	type ListFilterSession,
	type UseListFilterSessionOptions,
} from './model/useListFilterSession'

export {
	emitFilterUiEvent,
	subscribeFilterUiEvent,
	pageFilterKindToField,
	type FilterUiEvent,
} from './model/filterUiEvents'
