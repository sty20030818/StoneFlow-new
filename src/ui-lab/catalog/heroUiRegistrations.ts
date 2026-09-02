export const HEROUI_PACKAGES = {
	oss: { name: '@heroui/react', version: '3.2.4' },
	pro: { name: '@heroui-pro/react', version: '1.0.0-beta.8' },
} as const

export type HeroUIPackageName = (typeof HEROUI_PACKAGES)[keyof typeof HEROUI_PACKAGES]['name']
export type HeroUIExportKind = 'component' | 'function' | 'type'
export type HeroUIAdoption = 'used' | 'candidate' | 'no-current-scenario'

export type HeroUIRegistration = {
	id: string
	packageName: HeroUIPackageName
	packageVersion: string
	family: string
	exportPath: string
	exportKind: HeroUIExportKind
	adoption: HeroUIAdoption
	consumers: readonly string[]
	previewId: string | null
}

const OSS_COMPONENT_SUBPATHS = [
	'accordion',
	'alert',
	'alert-dialog',
	'autocomplete',
	'avatar',
	'badge',
	'breadcrumbs',
	'button',
	'button-group',
	'calendar',
	'calendar-year-picker',
	'card',
	'checkbox',
	'checkbox-group',
	'chip',
	'close-button',
	'color-area',
	'color-field',
	'color-input-group',
	'color-picker',
	'color-slider',
	'color-swatch',
	'color-swatch-picker',
	'combo-box',
	'date-field',
	'date-input-group',
	'date-picker',
	'date-range-picker',
	'description',
	'disclosure',
	'disclosure-group',
	'drawer',
	'dropdown',
	'empty-state',
	'error-message',
	'field-error',
	'fieldset',
	'form',
	'header',
	'input',
	'input-group',
	'input-otp',
	'kbd',
	'label',
	'link',
	'list-box',
	'list-box-item',
	'list-box-section',
	'menu',
	'menu-item',
	'menu-section',
	'meter',
	'modal',
	'number-field',
	'pagination',
	'popover',
	'progress-bar',
	'progress-circle',
	'radio',
	'radio-group',
	'range-calendar',
	'scroll-shadow',
	'search-field',
	'select',
	'separator',
	'skeleton',
	'slider',
	'spinner',
	'surface',
	'switch',
	'switch-group',
	'table',
	'tabs',
	'tag',
	'tag-group',
	'textarea',
	'textfield',
	'time-field',
	'toast',
	'toggle-button',
	'toggle-button-group',
	'toolbar',
	'tooltip',
	'typography',
] as const

const PRO_COMPONENT_SUBPATHS = [
	'action-bar',
	'agenda',
	'app-layout',
	'area-chart',
	'bar-chart',
	'carousel',
	'cell-color-picker',
	'cell-select',
	'cell-slider',
	'cell-switch',
	'chain-of-thought',
	'chart-tooltip',
	'chat-attachment',
	'chat-conversation',
	'chat-list-view',
	'chat-loader',
	'chat-message',
	'chat-message-actions',
	'chat-source',
	'chat-tool',
	'checkbox-button-group',
	'code-block',
	'command',
	'composed-chart',
	'context-menu',
	'data-grid',
	'drop-zone',
	'emoji-picker',
	'emoji-reaction-button',
	'empty-state',
	'file-tree',
	'floating-toc',
	'hover-card',
	'inline-select',
	'item-card',
	'item-card-group',
	'kanban',
	'kpi',
	'kpi-group',
	'line-chart',
	'list-view',
	'map',
	'markdown',
	'native-select',
	'navbar',
	'number-stepper',
	'number-value',
	'pie-chart',
	'pressable-feedback',
	'prompt-input',
	'prompt-suggestion',
	'radar-chart',
	'radial-chart',
	'radio-button-group',
	'rating',
	'resizable',
	'rich-text-editor',
	'segment',
	'sheet',
	'sidebar',
	'stepper',
	'text-shimmer',
	'timeline',
	'trend-chip',
	'widget',
] as const

const OSS_PRODUCTION_USAGE = [
	['src/app/providers/AppProviders.tsx', ['Toast']],
	['src/features/app-info/components/AboutDialog.tsx', ['Alert', 'Button', 'Modal', 'Spinner']],
	['src/features/app-info/components/AppVersionFooterItem.tsx', ['Chip']],
	['src/features/bulk-action/components/BulkActionBar.tsx', ['Button', 'Chip', 'Separator']],
	['src/features/bulk-action/components/bulk-action-result-toast.ts', ['toast']],
	['src/features/changelog/ChangelogDialog.tsx', ['Chip', 'Modal', 'Spinner']],
	['src/features/changelog/ChangelogRelease.tsx', ['Chip']],
	['src/features/command/components/CommandMenuListPrimitives.tsx', ['Chip', 'Kbd']],
	['src/features/command/components/CommandMenuSelectionChips.tsx', ['Chip']],
	['src/features/command/components/ShortcutHelp.tsx', ['Modal']],
	['src/features/danger-confirm/components/DangerConfirmDialog.tsx', ['AlertDialog', 'Button']],
	['src/features/display-options/components/DisplayOptionsButton.tsx', ['Button']],
	[
		'src/features/display-options/components/DisplayOptionsPanel.tsx',
		['Button', 'ListBox', 'Select', 'Separator', 'Switch'],
	],
	['src/features/display-options/components/DisplayOptionsPopover.tsx', ['Popover']],
	['src/features/display-options/components/PropertyToggleGrid.tsx', ['ToggleButton']],
	['src/features/entity-detail/components/EntityDetailDrawerHost.tsx', ['Surface']],
	[
		'src/features/filter/components/FilterBar.tsx',
		['Button', 'Dropdown', 'Input', 'Label', 'Modal', 'Selection'],
	],
	['src/features/filter/components/FilterMenu.tsx', ['Dropdown', 'SearchField']],
	['src/features/filter/components/FilterValueOption.tsx', ['Dropdown']],
	['src/features/filter/components/FilterValueSubMenu.tsx', ['Dropdown', 'SearchField']],
	['src/features/filter/components/PageFilterButton.tsx', ['Button']],
	['src/features/global-search/components/GlobalSearchInput.tsx', ['SearchField']],
	['src/features/global-search/components/GlobalSearchResults.tsx', ['Surface']],
	['src/features/launcher/chrome/LauncherFooter.tsx', ['Spinner']],
	['src/features/launcher/chrome/LauncherPanel.tsx', ['ScrollShadow']],
	['src/features/launcher/chrome/LauncherSurface.tsx', ['Surface']],
	['src/features/launcher/composer/PrimaryMetaBar.tsx', ['Button']],
	['src/features/launcher/composer/TitleInput.tsx', ['Input', 'TextField']],
	['src/features/launcher/composer/controls/DateControl.tsx', ['Button', 'Calendar', 'Popover']],
	['src/features/launcher/composer/controls/PlacementControl.tsx', ['Button', 'Dropdown']],
	['src/features/launcher/composer/controls/PriorityControl.tsx', ['Button', 'Dropdown']],
	['src/features/launcher/composer/controls/SpaceControl.tsx', ['Button', 'Dropdown']],
	['src/features/launcher/composer/controls/StatusControl.tsx', ['Button', 'Dropdown']],
	['src/features/launcher/create/CreateRow.tsx', ['Button']],
	['src/features/launcher/results/ContinuousToast.tsx', ['Alert', 'Chip']],
	['src/features/launcher/results/adapters/ProjectResultRowAdapter.tsx', ['Button']],
	['src/features/launcher/results/adapters/TaskResultRowAdapter.tsx', ['Button']],
	['src/features/lifecycle/components/LifecycleBoard.tsx', ['Alert', 'Button', 'Skeleton']],
	['src/features/lifecycle/components/LifecycleRowAdapter.tsx', ['Button', 'Checkbox']],
	['src/features/metadata-fields/components/CustomDateDialog.tsx', ['Button', 'Calendar', 'Modal']],
	['src/features/metadata-fields/components/MetadataFieldButton.tsx', ['Button']],
	['src/features/metadata-fields/components/MetadataFieldDropdown.tsx', ['Dropdown']],
	['src/features/metadata-fields/components/MetadataFieldMenuItem.tsx', ['Dropdown', 'Kbd']],
	['src/features/metadata-fields/components/MetadataFieldValue.tsx', ['Chip']],
	['src/features/metadata-fields/components/MetadataPlacementDropdown.tsx', ['Dropdown']],
	['src/features/metadata-fields/components/MetadataPlacementGroupList.tsx', ['Dropdown']],
	['src/features/project/components/ProjectBoard.tsx', ['Alert', 'Button', 'Skeleton']],
	[
		'src/features/project/components/ProjectCreateContent.tsx',
		['Alert', 'Button', 'FieldError', 'Form', 'Input', 'Switch', 'TextArea', 'TextField'],
	],
	['src/features/project/components/ProjectPage.tsx', ['Button', 'Dropdown']],
	['src/features/project/components/ProjectRowAdapter.tsx', ['Button', 'Checkbox']],
	['src/features/project-overview/components/ProjectOverviewPage.tsx', ['Button']],
	['src/features/settings/components/SettingsSidebar.tsx', ['Button', 'Tooltip']],
	[
		'src/features/settings/components/panels/SettingsGeneralPanel.tsx',
		['Alert', 'Button', 'ListBox', 'Radio', 'RadioGroup'],
	],
	[
		'src/features/settings/components/panels/SettingsSidebarPanel.tsx',
		['Alert', 'Button', 'Spinner'],
	],
	['src/features/settings/components/panels/SettingsSyncPanel.presentation.tsx', ['Card', 'Chip']],
	[
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
		[
			'Alert',
			'Button',
			'Description',
			'Disclosure',
			'Label',
			'NumberField',
			'Radio',
			'RadioGroup',
			'Surface',
		],
	],
	['src/features/settings/components/settingsShared.tsx', ['Card', 'Surface']],
	[
		'src/features/space/components/SpaceEditorDialog.tsx',
		['Alert', 'Button', 'ColorSwatchPicker', 'Input', 'Label', 'ListBox', 'Modal', 'Select'],
	],
	[
		'src/features/sync/components/SyncConfigDialog.tsx',
		['Alert', 'Button', 'FieldError', 'Label', 'Modal', 'TextArea', 'TextField', 'toast'],
	],
	['src/features/sync/components/SyncFooterStatusItem.tsx', ['Button', 'Spinner']],
	['src/features/task/components/TaskBoard.tsx', ['Alert', 'Button', 'Chip', 'Skeleton']],
	['src/features/task/components/TaskContextMenu.tsx', ['Header']],
	[
		'src/features/task/components/TaskCreateContent.tsx',
		['Button', 'FieldError', 'Form', 'Input', 'Switch', 'TextArea', 'TextField'],
	],
	['src/features/task/components/TaskListSceneView.tsx', ['Button']],
	['src/features/task/components/TaskRowCells.tsx', ['Checkbox']],
	['src/features/task/detail/components/TaskActivityTimeline.tsx', ['Alert', 'Button', 'Spinner']],
	['src/features/task/detail/components/TaskAutosaveStatus.tsx', ['Chip']],
	['src/features/task/detail/components/TaskDetailContent.tsx', ['Button', 'Separator']],
	['src/features/task/detail/components/TaskDetailHeader.tsx', ['Button']],
	['src/features/task/detail/components/TaskDrawerBody.tsx', ['ScrollShadow', 'Separator']],
	['src/features/task/detail/components/TaskDrawerFooter.tsx', ['Button']],
	[
		'src/features/task/detail/components/TaskLinkEditorPopover.tsx',
		['Button', 'Form', 'Input', 'Popover', 'TextField'],
	],
	['src/features/task/detail/components/TaskLinkRow.tsx', ['Button', 'Surface']],
	['src/features/task/detail/components/TaskLinksSection.tsx', ['Alert', 'Button', 'Spinner']],
	['src/features/task/detail/components/TaskNoteField.tsx', ['TextArea', 'TextField']],
	['src/features/task/detail/components/TaskPageMain.tsx', ['Card', 'Separator']],
	['src/features/task/detail/components/TaskPageSidebar.tsx', ['Alert', 'Card', 'Separator']],
	['src/features/task/detail/components/TaskPageState.tsx', ['Button']],
	['src/features/task/detail/components/TaskPreview.tsx', ['Card', 'Separator', 'Surface']],
	['src/features/task/detail/components/TaskTitleField.tsx', ['Input', 'TextField']],
	['src/features/task/detail/model/useTaskLinksController.ts', ['toast']],
	['src/features/update/components/SystemStatusChip.tsx', ['Alert', 'Button']],
	[
		'src/features/update/components/UpdateDialog.tsx',
		['Alert', 'Button', 'Modal', 'ProgressBar', 'ScrollShadow', 'Spinner', 'toast'],
	],
	['src/features/update/components/UpdateFooterChip.tsx', ['Button', 'ProgressCircle']],
	[
		'src/features/update/components/UpdateSettingsSection.presentation.tsx',
		['Chip', 'Description', 'Label', 'Radio', 'RadioGroup', 'ToggleButton', 'ToggleButtonGroup'],
	],
	['src/features/update/components/UpdateSettingsSection.tsx', ['Alert', 'Button', 'Spinner']],
	['src/features/update/hooks/useManualUpdateCheck.ts', ['toast']],
	['src/features/update/hooks/useUpdateEvents.ts', ['toast']],
	['src/features/update/hooks/useUpdateInstallActions.ts', ['toast']],
	['src/features/view/components/SavedViewPage.tsx', ['Button', 'Skeleton']],
	['src/features/view/components/ViewActionsMenu.tsx', ['Button', 'Dropdown']],
	[
		'src/features/view/components/ViewEditorDialog.tsx',
		['Button', 'Input', 'Label', 'ListBox', 'Modal', 'Select', 'ToggleButton', 'ToggleButtonGroup'],
	],
	['src/features/view/components/ViewsPage.tsx', ['Button', 'Input', 'Skeleton']],
	['src/shared/components/board/BoardLayout.tsx', ['Chip']],
	['src/layout/CreateDialogShell.tsx', ['Button', 'Dropdown', 'Modal']],
	['src/layout/ShellHeader.tsx', ['Button', 'Tooltip']],
	['src/layout/ShellSidebar.tsx', ['Button', 'Dropdown', 'Tooltip']],
	['src/layout/header/HistoryDropdown.tsx', ['Button', 'Dropdown']],
	['src/layout/header/NavBackForward.tsx', ['Button', 'Tooltip']],
	['src/layout/header/UserAppMenu.tsx', ['Avatar', 'Button', 'Dropdown']],
	['src/routes/__root.tsx', ['Button']],
	['src/routes/_shell/route.tsx', ['Button']],
	['src/shared/components/AppBreadcrumb.tsx', ['Breadcrumbs']],
	['src/shared/components/ShortcutTokens.tsx', ['Kbd']],
	['src/shared/components/create-modal-content.tsx', ['ScrollShadow']],
	[
		'src/shared/components/page-frame/PageFrame.tsx',
		['ScrollShadow', 'Separator', 'Surface', 'ToggleButton', 'ToggleButtonGroup', 'Toolbar'],
	],
	['src/shared/components/tooltip/ActionTooltip.tsx', ['Tooltip']],
	['src/shared/components/tooltip/DisabledActionTooltip.tsx', ['Tooltip']],
	['src/shared/components/tooltip/OverflowTooltip.tsx', ['Tooltip']],
] as const

const PRO_PRODUCTION_USAGE = [
	['src/features/bulk-action/components/BulkActionBar.tsx', ['ActionBar']],
	['src/features/changelog/ChangelogDialog.tsx', ['EmptyState']],
	['src/features/command/components/CommandMenu.tsx', ['Command']],
	['src/features/command/components/CommandMenuListPrimitives.tsx', ['Command']],
	['src/features/command/components/ScopedPickerCommandGroup.tsx', ['Command']],
	['src/features/entity-detail/components/EntityDetailDrawerHost.tsx', ['Resizable', 'Sheet']],
	['src/features/global-search/components/GlobalSearchResults.tsx', ['ListView']],
	['src/features/launcher/results/EmptyHint.tsx', ['EmptyState']],
	['src/features/lifecycle/components/LifecycleBoard.tsx', ['ContextMenu', 'EmptyState']],
	['src/features/lifecycle/components/LifecycleContextMenu.tsx', ['ContextMenu']],
	['src/features/project/components/ProjectBoard.tsx', ['ContextMenu', 'EmptyState']],
	['src/features/project/components/ProjectContextMenu.tsx', ['ContextMenu']],
	['src/features/project/components/ProjectPage.tsx', ['EmptyState']],
	['src/features/settings/components/SettingsSidebar.tsx', ['Sidebar']],
	['src/features/settings/components/panels/SettingsGeneralPanel.tsx', ['CellSelect']],
	['src/features/settings/components/settingsShared.tsx', ['CellSwitch']],
	['src/features/task/components/TaskBoard.tsx', ['ContextMenu', 'EmptyState']],
	['src/features/task/components/TaskContextMenu.tsx', ['ContextMenu']],
	['src/features/task/components/task-context-menu-items.tsx', ['ContextMenu']],
	['src/features/task/detail/components/TaskActivityTimeline.tsx', ['Timeline']],
	['src/features/task/detail/components/TaskPageState.tsx', ['EmptyState']],
	['src/features/view/components/SavedViewPage.tsx', ['EmptyState']],
	['src/features/view/components/ViewsPage.tsx', ['EmptyState']],
	['src/layout/ShellChrome.tsx', ['Sheet', 'Sidebar']],
	['src/layout/ShellLayoutContent.tsx', ['Sidebar']],
	['src/layout/ShellMain.tsx', ['ContextMenu']],
	['src/layout/ShellSidebar.tsx', ['ContextMenu', 'Sidebar']],
	['src/layout/sidebar/SidebarCustomizeSubmenu.tsx', ['ContextMenu']],
	['src/layout/sidebar/SidebarItemContextMenu.tsx', ['ContextMenu']],
	['src/layout/sidebar/SidebarNavRow.tsx', ['ContextMenu', 'Sidebar']],
	['src/routes/-router-feedback.tsx', ['EmptyState']],
	['src/shared/components/board/BoardSectionContextMenu.tsx', ['ContextMenu']],
] as const

const FAMILY_OVERRIDES: Readonly<Record<string, string>> = {
	'input-otp': 'InputOTP',
	kpi: 'KPI',
	'kpi-group': 'KPIGroup',
	textarea: 'TextArea',
	textfield: 'TextField',
}

const CANDIDATE_KEYS = new Set([
	'@heroui/react#Autocomplete',
	'@heroui/react#ComboBox',
	'@heroui-pro/react#HoverCard',
	'@heroui-pro/react#InlineSelect',
	'@heroui-pro/react#Segment',
])

const PREVIEW_IDS: Readonly<Record<string, string>> = {
	'@heroui/react#Breadcrumbs': 'heroui-breadcrumbs',
	'@heroui/react#Button': 'heroui-button',
	'@heroui/react#DatePicker': 'heroui-date-picker-candidate',
	'@heroui/react#Input': 'heroui-input',
	'@heroui/react#Modal': 'heroui-modal',
	'@heroui/react#SearchField': 'heroui-search-field-candidate',
	'@heroui/react#Select': 'heroui-select',
	'@heroui/react#Tooltip': 'heroui-tooltip',
	'@heroui-pro/react#EmptyState': 'heroui-empty-state',
	'@heroui-pro/react#ListView': 'heroui-list-view',
}

function familyFromSubpath(subpath: string) {
	return (
		FAMILY_OVERRIDES[subpath] ??
		subpath
			.split('-')
			.map((part) => `${part[0].toUpperCase()}${part.slice(1)}`)
			.join('')
	)
}

function indexConsumers(usage: readonly (readonly [string, readonly string[]])[]) {
	const index = new Map<string, string[]>()
	for (const [path, families] of usage) {
		for (const family of families) {
			const consumers = index.get(family)
			if (consumers) consumers.push(path)
			else index.set(family, [path])
		}
	}
	return index
}

function registrationKey(packageName: HeroUIPackageName, family: string) {
	return `${packageName}#${family}`
}

function componentRegistrations(
	packageMetadata: (typeof HEROUI_PACKAGES)[keyof typeof HEROUI_PACKAGES],
	subpaths: readonly string[],
	consumerIndex: ReadonlyMap<string, readonly string[]>,
): HeroUIRegistration[] {
	const packageId = packageMetadata.name === HEROUI_PACKAGES.oss.name ? 'oss' : 'pro'
	return subpaths.map((subpath) => {
		const family = familyFromSubpath(subpath)
		const key = registrationKey(packageMetadata.name, family)
		const consumers = consumerIndex.get(family) ?? []
		const previewId = PREVIEW_IDS[key] ?? null
		return {
			id:
				key === '@heroui/react#ColorSwatchPicker'
					? 'heroui-color-swatch-picker-ledger'
					: (previewId ?? `heroui-${packageId}-${subpath}`),
			packageName: packageMetadata.name,
			packageVersion: packageMetadata.version,
			family,
			exportPath: `${packageMetadata.name}/${subpath}`,
			exportKind: 'component',
			adoption:
				consumers.length > 0
					? 'used'
					: CANDIDATE_KEYS.has(key)
						? 'candidate'
						: 'no-current-scenario',
			consumers,
			previewId,
		}
	})
}

const ossConsumers = indexConsumers(OSS_PRODUCTION_USAGE)
const proConsumers = indexConsumers(PRO_PRODUCTION_USAGE)

export const HEROUI_REGISTRATIONS: readonly HeroUIRegistration[] = [
	...componentRegistrations(HEROUI_PACKAGES.oss, OSS_COMPONENT_SUBPATHS, ossConsumers),
	...componentRegistrations(HEROUI_PACKAGES.pro, PRO_COMPONENT_SUBPATHS, proConsumers),
	{
		id: 'heroui-oss-toast-function',
		packageName: HEROUI_PACKAGES.oss.name,
		packageVersion: HEROUI_PACKAGES.oss.version,
		family: 'toast',
		exportPath: `${HEROUI_PACKAGES.oss.name}/toast`,
		exportKind: 'function',
		adoption: 'used',
		consumers: ossConsumers.get('toast') ?? [],
		previewId: null,
	},
	{
		id: 'heroui-oss-selection-type',
		packageName: HEROUI_PACKAGES.oss.name,
		packageVersion: HEROUI_PACKAGES.oss.version,
		family: 'Selection',
		exportPath: HEROUI_PACKAGES.oss.name,
		exportKind: 'type',
		adoption: 'used',
		consumers: ossConsumers.get('Selection') ?? [],
		previewId: null,
	},
]
