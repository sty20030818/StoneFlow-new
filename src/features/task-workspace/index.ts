/**
 * task-workspace 场景对外公共面（`@/features/task-workspace`）。
 *
 * 供 routes、task、project 与 view 复用任务结果页组合、默认视图矩阵和 URL 选择契约。
 * 不负责任务数据、Saved View 持久化或路由挂载；外模块禁止深路径导入。
 */

/**
 * 按页面上下文返回代码定义的默认任务视图矩阵。
 *
 * 只描述稳定查询基线，不创建持久化 Saved View 实体。
 */
export {
	getDefaultTaskViews,
	type DefaultTaskView,
	type DefaultTaskViewKey,
} from './model/defaultTaskViews'

/**
 * 默认视图的 URL `v` 契约与 Router 驱动的选择 Hook。
 *
 * 切换基线会清除旧 Filter Draft；无效 `v` 会回到当前页面默认值。
 */
export {
	DEFAULT_TASK_VIEW_SEARCH_PARAM_KEY,
	useDefaultTaskViewSelection,
} from './model/useDefaultTaskViewSelection'

/**
 * 任务工作区路由的 search 解析器。
 *
 * 复用 filter 的 `f` 解析，并仅保留非空字符串 `v`。
 */
export { parseTaskWorkspaceSearch } from './model/taskWorkspaceSearch'

/**
 * 任务结果页唯一的 PageFrame 工作区组合。
 *
 * 调用方注入头部、显示键、筛选会话与任务 Board；本组件不获取或修改任务数据。
 */
export { TaskWorkspace } from './components/TaskWorkspace'
