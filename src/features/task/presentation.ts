/**
 * task 展示窄契约（`@/features/task/presentation`）。
 *
 * 仅导出稳定文案与纯展示组件，供其它 feature 复用 task 视觉，避免加载主 facade。
 */
export {
	TASK_PRIORITY_OPTIONS,
	type TaskPriorityValue,
	formatTaskPriorityLabel,
} from './model/taskPriority'
export { TASK_STATUS_OPTIONS, formatTaskStatusLabel } from './model/taskStatus'
export { PriorityIcon } from './model/indicators/PriorityIcon'
export { TaskStatusIndicator } from './model/indicators/TaskStatusIndicator'
