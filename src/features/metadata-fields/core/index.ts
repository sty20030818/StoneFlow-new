export type {
	MetadataActionFieldKey,
	MetadataActionIconKey,
	MetadataActionOption,
	MetadataActionSpec,
} from './metadata-action-spec'
export type {
	MetadataDateOption,
	MetadataDateOptionKey,
	MetadataFieldIndicator,
	MetadataFieldOption,
	MetadataFieldValue,
	MetadataValueComparator,
} from './metadata-field.types'
// placement 所有权在 task；经 contract 引用避免主 barrel 环
export type {
	BuildTaskPlacementGroupsInput,
	TaskPlacementGroup,
	TaskPlacementGroupItem,
	TaskPlacementGroupProject,
	TaskPlacementGroupSpace,
	TaskPlacementTarget,
} from '@/features/task/contract'
export {
	createDueDateActionSpec,
	createParentProjectActionSpec,
	createPriorityActionSpec,
	createSpaceActionSpec,
	createStatusActionSpec,
} from './metadata-action-factories'
export {
	mapMetadataActionSpecToDropdownProps,
	type MetadataDropdownMappedProps,
} from './dropdown-spec-mapping'
export { renderMetadataActionIcon, setMetadataDomainIconRenderer } from './metadata-icon-tokens'
export {
	buildMetadataShortcutItems,
	defaultMetadataValueComparator,
	getMetadataFieldIndicator,
	type MetadataShortcutMode,
} from './metadata-selection'
export {
	addLocalDays,
	createMetadataDateOptionsConfig,
	formatMetadataDisplayDate,
	formatLocalDate,
	getEndOfLocalWeek,
	normalizeMetadataDateValue,
	startOfLocalDay,
} from './metadata-date-options'
export type { CustomDateFieldKey } from './custom-date-dialog'
export {
	getCustomDateDialogDescription,
	getCustomDateDialogRemoveLabel,
	getCustomDateDialogSubmitLabel,
	getCustomDateDialogTitle,
} from './custom-date-dialog'
export {
	buildTaskPlacementGroups,
	findTaskPlacementGroupItem,
	getTaskPlacementGroupSearchText,
	getTaskPlacementTargetValue,
	isTaskPlacementTargetEqual,
	resolveTaskPlacementTarget,
} from '@/features/task/contract'
