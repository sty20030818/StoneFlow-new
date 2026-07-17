/**
 * @fileoverview **filter · 唯一对外公共面（`@/features/filter`）**
 *
 * 页级筛选平台：Provider + 通用类型/工具。任务页 controller 在 `@/features/task`。
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

/** 页筛选命令 handlers（供壳 compose）。 */
export { registerFilterCommands } from './commands/registerFilterCommands'
