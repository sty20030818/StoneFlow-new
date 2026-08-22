/**
 * view 域对外公共面（`@/features/view`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/view'`。
 * 禁止深路径进 api/hooks/components。
 * Saved View 定义 + 任务工作区编排；任务写路径只组合 task public。
 */

// ── Hooks ───────────────────────────────────────────────────────────────────

/** 视图列表 Query（project-overview 侧栏等）。 */
export { useViewsQuery } from './hooks'

/** URL search → 仅 `f`（临时 FilterQuery）。 */
export { parseViewSearch } from './api/viewSearch'

/** View 变更 mutations。 */
export { useCreateViewMutation, useUpdateViewMutation } from './hooks/view.mutations'

// ── UI ──────────────────────────────────────────────────────────────────────

/** Saved View Library（route `/views`）。 */
export { ViewsPage } from './components/ViewsPage'

/** Saved View 任务工作区（route `/views/$viewId`）。 */
export { SavedViewPage } from './components/SavedViewPage'
