/**
 * 窄契约入口（无 React 页面 / 无厚 barrel）。
 * 供 metadata-fields、command 等跨 feature 引用 placement 类型与纯函数，避免经 `@/features/task` 主入口形成环。
 */

export type { TaskPlacementTarget } from './model/taskPlacementTarget'
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
export {
	buildTaskPlacementGroups,
	findTaskPlacementGroupItem,
	getTaskPlacementGroupSearchText,
} from './model/taskPlacementGroups'
