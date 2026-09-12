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

/** 保存用例：当前查询快照、返回身份、导航与失败恢复。 */
export { useViewSaveFlow, type ViewSaveCommand, type ViewSaveFlow } from './hooks/useViewSaveFlow'

// ── UI ──────────────────────────────────────────────────────────────────────

/** Saved View Library（route `/views`）。 */
export { ViewsPage, SavedViewLibraryContent } from './components/ViewsPage'

/** Saved View 任务工作区（route `/views/$viewId`）。 */
export { SavedViewPage, SavedViewPageState } from './components/SavedViewPage'

/** 保存视图管理交互（UI Lab 使用生产组件与内存回调）。 */
export { ViewActionsMenu } from './components/ViewActionsMenu'
export { ViewEditorDialog } from './components/ViewEditorDialog'
export { ViewSaveDialog } from './components/ViewSaveDialog'
