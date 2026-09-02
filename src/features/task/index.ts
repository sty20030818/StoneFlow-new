/**
 * task 域对外公共面（`@/features/task`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/task'`（placement 可用 `./contract`）。
 * 禁止深路径进 components/api/hooks/model/detail。
 * 宜导出 facade、稳定标签、已有外消费者的 api/query；禁止预防性撑大 public。
 */

// ─────────────────────────────────────────────────────────────────────────────
// 列表场景
// ─────────────────────────────────────────────────────────────────────────────

/**
 * all / standalone 共用列表场景。
 *
 * routes 只挂此组件 + variant，不写列表 wiring。
 */
export { TaskListSceneView } from './components/TaskListSceneView'

/**
 * 任务集合使用的 Board UI。
 */
export { TaskBoard, type TaskBoardPagination, type TaskBoardProps } from './components/TaskBoard'

/** 详情等跨 feature 入口按 stable task id 恢复虚拟行焦点。 */
export { focusTaskBoardTaskId } from './components/taskBoardFocus'

/**
 * 壳层「新建任务」对话框内容。
 */
export { TaskCreateContent } from './components/TaskCreateContent'

/**
 * 打开目标 path 与壳层 detail 开关判定。
 *
 * 命令 / open intent 只调这里，不在 layout 维护打开规则。
 */
export { resolveCommandOpenTargetPath, resolveShellDetailState } from './model/taskOpenStrategy'

/**
 * 任务批量：动作定义 + adapter（引擎在 bulk-action）。
 */
export { taskBulkActions, createTaskBulkAdapter, type TaskBulkAdapter } from './bulk'

/**
 * 列表选中 → 命令板 CommandSelection 快照。
 */
export { buildTaskCommandSelection } from './model/buildTaskCommandSelection'

/**
 * placement 目标类型（亦可走 `./contract`）。
 */
export type { TaskPlacementTarget } from './model/taskPlacementTarget'

/**
 * 装配根注册 metadata 的 status/priority 图标（壳启动一次）。
 */
export { registerTaskMetadataIcons } from './model/registerTaskMetadataIcons'

/**
 * 向命令宿主注册任务域 handlers。
 */
export { registerTaskCommands } from './commands'

// ─────────────────────────────────────────────────────────────────────────────
// 详情（detail 子树经本文件再导出）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 全页任务详情。
 */
export { TaskPage } from './detail/components/TaskPage'

/**
 * 详情页级空态 / 失败态。
 */
export { TaskPageState } from './detail/components/TaskPageState'

/**
 * Aside / 完整页共用的任务详情内容与状态模型。
 */
export { TaskDetailContent } from './detail/components/TaskDetailContent'
export {
	useTaskDetailViewModel,
	type TaskDetailViewModel,
} from './detail/model/useTaskDetailViewModel'

/**
 * 列表预览浮层。
 */
export { TaskPreview } from './detail/components/TaskPreview'

/**
 * 任务预览 Provider（须挂主壳树，见 ShellProviders）。
 */
export { TaskPreviewProvider } from './detail/model/TaskPreviewProvider'

/**
 * 打开/关闭/同步预览目标。
 */
export { useTaskPreviewController } from './detail/model/useTaskPreviewController'

/**
 * 向预览系统注册可见任务源（入参保持引用稳定）。
 */
export { useRegisterTaskPreviewSource } from './detail/model/TaskPreviewProvider'

// ─────────────────────────────────────────────────────────────────────────────
// 列表编排 hooks
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 列表 mutation 编排（状态/优先级/日期/归档等 + pending id）。
 */
export { useTaskListController } from './hooks/useTaskListController'

/**
 * 列表多选 / 焦点 / 范围选择。
 */
export { useTaskSelection } from './hooks/useTaskSelection'

/**
 * 列表数据 facade（Query → items + status）。
 */
export { useTaskBoardPagination, useTaskQueryCount, useTaskQueryData } from './hooks/useTaskData'

/**
 * 任务集合的共享筛选、展示、选择、预览、批量与 Board 编排。
 */
export {
	useTaskCollectionScene,
	type TaskCollectionSceneInput,
} from './hooks/useTaskCollectionScene'

/**
 * 详情 loader / ensureQueryData 用的 queryOptions。
 */
export { taskDetailQueryOptions } from './hooks/task.queries'

// ─────────────────────────────────────────────────────────────────────────────
// Model · 标签 / 指示器
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 主 facade 汇总展示契约；跨 feature 的纯展示消费应直连 `./presentation`。
 */
export {
	PriorityIcon,
	TASK_PRIORITY_OPTIONS,
	TASK_STATUS_OPTIONS,
	TaskStatusIndicator,
	type TaskPriorityValue,
	formatTaskPriorityLabel,
	formatTaskStatusLabel,
} from './presentation'

// ─────────────────────────────────────────────────────────────────────────────
// API · 仅已有外消费者
// ─────────────────────────────────────────────────────────────────────────────

/**
 * 读详情（非 React 路径：导航记忆等）。
 */
export { getTaskDetail } from './api/tasks'

/**
 * 创建任务（Launcher 等；主窗优先 CreateContent + mutations）。
 */
export { createTask } from './api/tasks'

/**
 * 恢复 / 硬删（lifecycle 编排）。
 */
export { restoreTask, deleteTask } from './api/tasks'
