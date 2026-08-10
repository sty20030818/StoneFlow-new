/**
 * metadata-fields 的纯领域契约；不导出 React 组件或 Tooltip/Command 适配器。
 */
export type {
	MetadataActionIconKey,
	MetadataActionSpec,
	MetadataActionOption,
} from './core/metadata-action-spec'

export type { TaskPlacementGroup, TaskPlacementTarget } from '@/features/task/contract'

export {
	buildTaskPlacementGroups,
	getTaskPlacementTargetValue,
	resolveTaskPlacementTarget,
} from '@/features/task/contract'

export {
	createDueDateActionSpec,
	createPriorityActionSpec,
	createStatusActionSpec,
} from './core/metadata-action-factories'

export { normalizeMetadataDateValue } from './core/metadata-date-options'
