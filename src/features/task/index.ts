/**
 * @fileoverview **task · 唯一对外公共面（`@/features/task`）**
 *
 * ## 契约（终态）
 *
 * - **外模块**（`app` / `layout` / `routes` / 其它 `features/*`）**只能**：
 *   ```ts
 *   import { … } from '@/features/task'
 *   ```
 * - **禁止**深路径：`@/features/task/components|api|hooks|model|detail|…`
 * - **本 feature 内部**可继续深 import 具体文件；`detail/` 是内聚子树，不是第二入口
 *
 * ## 放什么 / 不放什么
 *
 * | 宜导出 | 不宜导出 |
 * |--------|----------|
 * | 列表/详情 facade、官方场景组件 | 内部 section / 私有 hook 碎片 |
 * | 稳定 model 标签与指示器 | 半成品 DTO、未稳定 API |
 * | 已被壳或其它 feature 使用的 api / queryOptions | `export *` 扫整夹 |
 *
 * 新增导出前：确认**已有**外消费者；禁止「预防性」撑大 public。
 *
 * @see Docs To-Be T1 §4 Public vs Private
 */

// ─────────────────────────────────────────────────────────────────────────────
// 列表场景（routes 薄页 · 产品主路径）
// ─────────────────────────────────────────────────────────────────────────────

/**
 * inbox / all / no-project 共用列表场景视图（EntityScene 拼装）。
 * routes 只挂此组件 + variant，不写列表 wiring。
 */
export { TaskListSceneView } from './components/TaskListSceneView'

/**
 * 三列表唯一 wiring：data / filter / display / selection / preview / bulk 注册。
 * 一般经 {@link TaskListSceneView} 使用；厚页（如 project 内嵌）可直接调。
 */
export {
	useTaskListScene,
	type TaskListSceneVariant,
	type TaskListSceneFacade,
} from './hooks/useTaskListScene'

/** 任务看板 UI；layout EntityScene adapter、project 页等复用。 */
export { TaskBoard } from './components/TaskBoard'

/** 壳层「新建任务」对话框内容。 */
export { TaskCreateContent } from './components/TaskCreateContent'

// ─────────────────────────────────────────────────────────────────────────────
// 详情三形态（detail 子树 · 经本文件再导出，外层不 import detail/）
// ─────────────────────────────────────────────────────────────────────────────

/** 全页任务详情（独立路由）。 */
export { TaskPage } from './detail/components/TaskPage'

/** 详情加载失败 / 空态等页级状态块。 */
export { TaskPageState } from './detail/components/TaskPageState'

/** 侧栏/URL 驱动的任务抽屉。 */
export { TaskDrawer } from './detail/components/TaskDrawer'

/** 列表键盘/指针预览浮层。 */
export { TaskPreview } from './detail/components/TaskPreview'

/**
 * 任务预览上下文 Provider。
 * 须挂在主壳树内（见 layout ShellProviders），列表页才能 register source。
 */
export { TaskPreviewProvider } from './detail/model/TaskPreviewProvider'

/** 打开/关闭/同步预览目标。 */
export { useTaskPreviewController } from './detail/model/useTaskPreviewController'

/**
 * 当前列表向预览系统注册「可见任务源」。
 * 入参请 useMemo 稳定引用，避免无意义的 effect 重跑。
 */
export { useRegisterTaskPreviewSource } from './detail/model/TaskPreviewProvider'

// ─────────────────────────────────────────────────────────────────────────────
// 列表编排 hooks（被 project / view 等厚页复用）
// ─────────────────────────────────────────────────────────────────────────────

/** 列表 mutation 编排：改状态/优先级/日期/归档删除等 + pending id。 */
export { useTaskListController } from './model/useTaskListController'

/** 列表多选 / 焦点 / 范围选择。 */
export { useTaskSelection } from './model/useTaskSelection'

/** 列表数据 facade（Query → items + status）。 */
export { useTaskListData } from './hooks/useTaskData'

/** 详情 loader / ensureQueryData 用的稳定 queryOptions。 */
export { taskDetailQueryOptions } from './hooks/task.queries'

// ─────────────────────────────────────────────────────────────────────────────
// Model · 稳定标签 / 选项 / 指示器（metadata、command、QC 等）
// ─────────────────────────────────────────────────────────────────────────────

export {
	TASK_PRIORITY_OPTIONS,
	type TaskPriorityValue,
	formatTaskPriorityLabel,
	getTaskPriorityOption,
	normalizeTaskPriorityValue,
} from './model/taskPriority'

export { TASK_STATUS_OPTIONS, formatTaskStatusLabel, getTaskStatusOption } from './model/taskStatus'

export {
	TASK_CREATE_PLACEMENT_OPTIONS,
	formatTaskPlacementLabel,
	getTaskPlacement,
	buildCreatePlacementInput,
} from './model/taskPlacement'

/** 纯展示优先级图标（无业务 hook；metadata 可用）。 */
export { PriorityIcon } from './model/indicators/PriorityIcon'

/** 纯展示状态指示器（无业务 hook；metadata 可用）。 */
export { TaskStatusIndicator } from './model/indicators/TaskStatusIndicator'

/**
 * 选择算法纯函数（selection platform 复用）。
 * 带 React 状态的列表选择请用 {@link useTaskSelection}。
 */
export {
	type TaskSelectionSnapshot,
	type TaskSelectionFocusState,
	pruneTaskSelection,
	toggleTaskIdSelection,
	moveTaskSelectionFocus,
	selectTaskRange,
	mergeTaskSelectionRange,
	toggleTaskSelectionByVisibleOrder,
	pruneTaskSelectionFocusState,
	buildTaskSelectionSnapshot,
} from './model/taskSelection'

// ─────────────────────────────────────────────────────────────────────────────
// API · 仅外放「已被壳 / 其它 feature 使用」的 IO
// 组件与 routes 优先走 hooks；下列函数供 badge、lifecycle、bulk、导航记忆等
// ─────────────────────────────────────────────────────────────────────────────

export {
	listTasks,
	getTaskDetail,
	createTask,
	updateTask,
	archiveTask,
	restoreTask,
	deleteTask,
} from './api/tasks'
