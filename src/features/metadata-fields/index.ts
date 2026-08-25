/**
 * metadata-fields 对外公共面（`@/features/metadata-fields`）。
 *
 * @remarks
 * 外模块只能：`import { … } from '@/features/metadata-fields'`。
 * 禁止深路径进 core/components/adapters。
 * 纯 task 标签/图标优先 `@/features/task`。
 */

// ── core ────────────────────────────────────────────────────────────────────

export type {
	MetadataActionIconKey,
	MetadataActionSpec,
	TaskPlacementGroup,
	TaskPlacementTarget,
	MetadataDropdownMappedProps,
} from './core'

export {
	createDueDateActionSpec,
	createPriorityActionSpec,
	createStatusActionSpec,
	mapMetadataActionSpecToDropdownProps,
	setMetadataDomainIconRenderer,
	normalizeMetadataDateValue,
	buildTaskPlacementGroups,
	getTaskPlacementTargetValue,
	resolveTaskPlacementTarget,
} from './core'

// ── components ──────────────────────────────────────────────────────────────

export {
	MetadataFieldDropdown,
	type MetadataCommandShortcut,
	MetadataFieldButton,
	MetadataDateDropdown,
	MetadataFieldValue,
	CustomDateDialog,
	MetadataPlacementDropdown,
} from './components'

// ── adapters ────────────────────────────────────────────────────────────────

export {
	createTaskPlacementGroupedDropdownProps,
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	getTaskPriorityMetadataDropdownProps,
	getTaskStatusMetadataDropdownProps,
	taskDateMetadataIcons,
	createProjectParentMetadataDropdownProps,
	projectDateMetadataIcons,
	createSpaceMetadataDropdownProps,
	createSpaceMetadataOptions,
	getSpaceMetadataButtonVisual,
} from './adapters'
