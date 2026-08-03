/**
 * @fileoverview **filter · 唯一对外公共面（`@/features/filter`）**
 *
 * - **core**：FilterQuery 领域（clause / URL / adapt）— 长期真源
 * - **model**：页级 Provider（旧扁平 controller，P3–P7 将替换）
 *
 * 外模块：`import { … } from '@/features/filter'`
 * 禁止：`@/features/filter/model/…`、`@/features/filter/core/…` 深路径
 */

// ── 领域核（P0+）──────────────────────────────────────────
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

// ── 页筛选上下文（过渡：P7 前仍被场景使用）────────────────
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

/** 页筛选命令 handlers（供壳 compose）。 */
export { registerFilterCommands } from './commands/registerFilterCommands'

/** 工具条「筛选」按钮（锚定 FilterMenu / 兼容 Command）。 */
export { PageFilterButton } from './components/PageFilterButton'
export { FilterBar } from './components/FilterBar'
export { FilterMenu } from './components/FilterMenu'
export {
	ListFilterUiProvider,
	useListFilterUi,
	type FilterProjectOption,
	type ListFilterUiValue,
} from './model/ListFilterUiContext'

/** 列表筛选会话：base + URL temp → effective */
export {
	parseListFilterSearch,
	useListFilterSession,
	type ListFilterSession,
	type UseListFilterSessionOptions,
} from './model/useListFilterSession'

/** 旧 querySlice → FilterQuery（P7 删除） */
export {
	pageFilterSliceToFilterQuery,
	type PageFilterQuerySlice,
} from './model/pageFilterSliceBridge'

/** 快捷键 / 命令 → Filter 表面 */
export {
	emitFilterUiEvent,
	subscribeFilterUiEvent,
	pageFilterKindToField,
	type FilterUiEvent,
} from './model/filterUiEvents'
