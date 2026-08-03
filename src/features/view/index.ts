/**
 * view 域对外公共面（`@/features/view`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/view'`。
 * 禁止深路径进 api/hooks/components。
 * 自定义视图定义 + 跑任务板编排；任务写路径只组合 task public。
 */

// ── Hooks ───────────────────────────────────────────────────────────────────

/** 视图列表 Query（project-overview 侧栏等）。 */
export { useViewsQuery } from './hooks'

/** URL search → 仅 `f`（临时 FilterQuery）。 */
export { parseViewSearch } from './api/viewSearch'

/** 创建自定义 View（FilterBar Save 等）。 */
export { createView } from './api/views'

/** View 变更 mutations。 */
export { useCreateViewMutation, useUpdateViewMutation } from './hooks/view.mutations'

// ── UI ──────────────────────────────────────────────────────────────────────

/** 自定义视图页（routes `/views`、`/views/$viewId`）。 */
export { ViewsPage } from './components/ViewsPage'
