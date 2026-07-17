/**
 * @fileoverview **metadata-fields · 主入口（`@/features/metadata-fields`）**
 *
 * 显式 export 清单。纯 task 标签/图标优先 `@/features/task`。
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
	createPlacementActionSpec,
	createPriorityActionSpec,
	createSpaceActionSpec,
	createStatusActionSpec,
	mapMetadataActionSpecToDropdownProps,
	renderMetadataActionIcon,
	setMetadataDomainIconRenderer,
	buildMetadataShortcutItems,
	defaultMetadataValueComparator,
	getMetadataFieldIndicator,
	addLocalDays,
	createMetadataDateOptions,
	createMetadataDateOptionsConfig,
	formatMetadataDisplayDate,
	formatLocalDate,
	getEndOfLocalWeek,
	normalizeMetadataDateValue,
	startOfLocalDay,
	formatCustomDateInputValue,
	formatCustomDateStorageValue,
	getCustomDateDialogDescription,
	getCustomDateDialogRemoveLabel,
	getCustomDateDialogSubmitLabel,
	getCustomDateDialogTitle,
	normalizeCustomDateInputValue,
	parseCustomDateInputValue,
	buildTaskPlacementGroups,
	findTaskPlacementGroupItem,
	getTaskPlacementGroupSearchText,
	getTaskPlacementTargetValue,
	isTaskPlacementTargetEqual,
	resolveTaskPlacementTarget,
} from './core'

// ── components ──────────────────────────────────────────────────────────────

export {
	MetadataFieldButton,
	stopMetadataFieldEventPropagation,
	type MetadataFieldButtonProps,
	MetadataFieldMenuItem,
	type MetadataFieldMenuItemProps,
	MetadataFieldDropdown,
	type MetadataFieldDropdownProps,
	MetadataDateDropdown,
	type MetadataDateDropdownProps,
	MetadataDateButton,
	type MetadataDateButtonProps,
	CustomDateDialog,
	MetadataPlacementDropdown,
	type MetadataPlacementDropdownProps,
	MetadataPlacementGroupList,
	type MetadataPlacementGroupListProps,
} from './components'

// ── adapters ────────────────────────────────────────────────────────────────

export {
	createTaskPlacementGroupedDropdownProps,
	createTaskPriorityMetadataDropdownProps,
	createTaskPriorityMetadataOptions,
	createTaskStatusMetadataDropdownProps,
	createTaskStatusMetadataOptions,
	taskDateMetadataIcons,
	createProjectParentMetadataDropdownProps,
	projectDateMetadataIcons,
	createSpaceMetadataDropdownProps,
	createSpaceMetadataOptions,
	getSpaceMetadataButtonVisual,
} from './adapters'
