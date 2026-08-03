/**
 * filter 领域核：类型、normalize、URL codec、查询适配。
 * 无 React / 无 Tauri。
 */

export {
	adaptFilterQueryToListTasks,
	adaptFilterQueryToViewFilters,
	type ListTasksFilterPatch,
} from './adapt'
export {
	createFilterClause,
	createFilterClauseId,
	filterQueriesEqual,
	isFilterDateValue,
	isFilterQueryEmpty,
	normalizeFilterQuery,
	removeFilterField,
	setFilterFieldClause,
} from './normalize'
export {
	EMPTY_FILTER_QUERY,
	FILTER_DATE_VALUE_VALUES,
	FILTER_FIELD_VALUES,
	FILTER_OP_VALUES,
	FILTER_PROJECT_NONE_VALUE,
	type FilterClause,
	type FilterDateValue,
	type FilterField,
	type FilterOp,
	type FilterQuery,
} from './types'
export {
	decodeFilterQueryFromSearchParam,
	encodeFilterQueryToSearchParam,
	FILTER_SEARCH_PARAM_KEY,
	mergeFilterQueryIntoSearch,
	readFilterQueryFromSearch,
} from './url-codec'
