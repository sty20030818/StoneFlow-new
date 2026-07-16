/**
 * @fileoverview **view · 唯一对外公共面**
 *
 * 自定义视图定义与执行：列表/run Query、mutations、Views 页与编辑器。
 * （原 `features/views` 已合并入本 feature。）
 *
 * 外模块：`import { … } from '@/features/view'`
 * 禁止：`@/features/view/api|hooks|components/…`
 */

// ── Hooks ───────────────────────────────────────────────────────────────────

export {
	useViewsQuery,
	useTaskViewRunQuery,
	useCreateViewMutation,
	useUpdateViewMutation,
	useDeleteViewMutation,
	useToggleViewVisibleMutation,
	useReorderViewsMutation,
	viewKeys,
} from './hooks'

// ── 官方组件 ────────────────────────────────────────────────────────────────

/**
 * 视图列表/执行页（routes `/views`、`/views/$viewId`）。
 */
export { ViewsPage } from './components/ViewsPage'

/** 创建/编辑视图对话框（也可被页内使用；外层一般只挂 ViewsPage）。 */
export { ViewEditorDialog } from './components/ViewEditorDialog'

/** 视图行操作菜单。 */
export { ViewActionsMenu } from './components/ViewActionsMenu'
