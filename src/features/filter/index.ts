/**
 * @fileoverview **filter · 唯一对外公共面（`@/features/filter`）**
 *
 * 页级筛选 Provider + task 列表页 filter controller。
 *
 * 外模块：`import { … } from '@/features/filter'`
 * 禁止：`@/features/filter/model/…`
 */

/** 页筛选上下文 Provider（layout ShellProviders）。 */
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

/**
 * 任务列表页筛选控制器（status/priority/date/projectless 等）。
 * 与 {@link useRegisterPageFilterController} 成对使用。
 */
export { useTaskPageFilterController } from './model/useTaskPageFilterController'
