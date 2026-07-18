/**
 * task placement 窄契约（`@/features/task/contract`）。
 *
 * 供 metadata-fields 等跨 feature 引用 placement 类型与纯函数，
 * 避免经主 barrel 成环。无 React、无 IO。
 */

/**
 * 任务归属目标（收件箱 / 无项目 / 项目）。
 */
export type { TaskPlacementTarget } from './model/taskPlacementTarget'

/**
 * 目标 → 稳定字符串 value（菜单选中比较用）。
 */
export {
	getTaskPlacementTargetValue,
	isTaskPlacementTargetEqual,
	resolveTaskPlacementTarget,
} from './model/taskPlacementTarget'

export type {
	BuildTaskPlacementGroupsInput,
	TaskPlacementGroup,
	TaskPlacementGroupItem,
	TaskPlacementGroupProject,
	TaskPlacementGroupSpace,
} from './model/taskPlacementGroups'

/**
 * 按空间分组的可放置目标列表（命令板 / 下拉）。
 */
export {
	buildTaskPlacementGroups,
	findTaskPlacementGroupItem,
	getTaskPlacementGroupSearchText,
} from './model/taskPlacementGroups'
