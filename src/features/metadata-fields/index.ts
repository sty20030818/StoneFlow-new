/**
 * @fileoverview **metadata-fields · 主入口（`@/features/metadata-fields`）**
 *
 * 显式 export 清单。纯 task 标签/图标优先 `@/features/task`。
 * 仅包内 UI 原语与日期文案工具不进 public。
 */

// ── core ────────────────────────────────────────────────────────────────────

export type {
	MetadataActionFieldKey,
	MetadataActionIconKey,
	MetadataActionOption,
	MetadataActionSpec,
	MetadataDateOption,
	MetadataDateOptionKey,
	MetadataFieldIndicator,
	MetadataFieldOption,
	MetadataFieldValue,
	MetadataValueComparator,
	BuildTaskPlacementGroupsInput,
	TaskPlacementGroup,
	TaskPlacementGroupItem,
	TaskPlacementGroupProject,
	TaskPlacementGroupSpace,
	TaskPlacementTarget,
	CustomDateFieldKey,
	MetadataDropdownMappedProps,
	MetadataShortcutMode,
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
	isTaskPlacementTargetEqual,
	resolveTaskPlacementTarget,
} from './core'

// ── components ──────────────────────────────────────────────────────────────

export {
	MetadataFieldDropdown,
	type MetadataFieldDropdownProps,
	MetadataDateDropdown,
	type MetadataDateDropdownProps,
	MetadataDateButton,
	type MetadataDateButtonProps,
	CustomDateDialog,
	MetadataPlacementDropdown,
	type MetadataPlacementDropdownProps,
} from './components'

// ── adapters ────────────────────────────────────────────────────────────────

export {
	createTaskPlacementGroupedDropdownProps,
	createTaskPriorityMetadataDropdownProps,
	createTaskStatusMetadataDropdownProps,
	taskDateMetadataIcons,
	createProjectParentMetadataDropdownProps,
	projectDateMetadataIcons,
	createSpaceMetadataDropdownProps,
	createSpaceMetadataOptions,
	getSpaceMetadataButtonVisual,
} from './adapters'
