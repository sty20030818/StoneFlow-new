import { HEROUI_REGISTRATIONS } from './heroUiRegistrations'

export type StoneFlowRegistrationCoverage = 'covered-in-composition' | 'real-app-only'

export type StoneFlowCatalogRegistration = {
	id: string
	kind: 'component' | 'product-scene'
	name: string
	definitionPath: string
	consumers: readonly string[]
	compositionParent: string | null
	ingredients: readonly string[]
	owner: 'Product'
	recommendedOwner: 'Product'
	disposition: 'keep' | 'real-app-only'
	adoption: 'used'
	coverage: StoneFlowRegistrationCoverage
	reason: string
	verification: string
}

type ComponentGroup = readonly [
	definitionPath: string,
	compositionParent: ProductSceneId,
	names: readonly string[],
]

type PrivateLeafGroup = readonly [
	definitionPath: string,
	compositionParentName: string,
	names: readonly string[],
]

const PRODUCT_SCENE_PATHS = {
	'main-app': 'src/main.tsx',
	shell: 'src/layout/ShellLayoutContent.tsx',
	'task-board': 'src/features/task/components/TaskBoard.tsx',
	'task-detail': 'src/features/task/detail/components/TaskDetailContent.tsx',
	'global-search': 'src/features/global-search/components/GlobalSearchInput.tsx',
	launcher: 'src/features/launcher/LauncherPage.tsx',
	'collection-pages': 'src/features/task-workspace/components/TaskWorkspace.tsx',
	'command-menu': 'src/features/command/components/CommandMenu.tsx',
	'task-workspace': 'src/features/task-workspace/components/TaskWorkspace.tsx',
	'settings-sync': 'src/features/settings/components/SettingsPage.tsx',
	'entity-detail': 'src/features/entity-detail/components/EntityDetailDrawerHost.tsx',
	'feedback-recovery': 'src/layout/overlays/ShellOverlays.tsx',
	'space-editor': 'src/features/space/components/SpaceEditorDialog.tsx',
	'create-dialogs': 'src/layout/CreateDialogShell.tsx',
	'collection-rows': 'src/features/task/components/TaskRowAdapter.tsx',
	'shared-ui': 'src/layout/ShellChrome.tsx',
} as const

type ProductSceneId = keyof typeof PRODUCT_SCENE_PATHS

const EXPORTED_COMPONENT_GROUPS = [
	['src/app/App.tsx', 'main-app', ['App']],
	['src/features/app-info/components/AboutDialog.tsx', 'feedback-recovery', ['AboutDialog']],
	[
		'src/features/app-info/components/AppVersionFooterItem.tsx',
		'feedback-recovery',
		['AppVersionFooterItem'],
	],
	['src/features/bulk-action/components/BulkActionBar.tsx', 'task-board', ['BulkActionBar']],
	['src/features/changelog/ChangelogDialog.tsx', 'feedback-recovery', ['ChangelogDialog']],
	['src/features/changelog/ChangelogMarkdown.tsx', 'feedback-recovery', ['ChangelogMarkdown']],
	['src/features/changelog/ChangelogRelease.tsx', 'feedback-recovery', ['ChangelogRelease']],
	['src/features/command/components/ChordHint.tsx', 'command-menu', ['ChordHint']],
	[
		'src/features/command/components/CommandActionTooltip.tsx',
		'command-menu',
		[
			'CommandShortcut',
			'CommandTooltipRow',
			'CommandActionTooltip',
			'DisabledCommandActionTooltip',
		],
	],
	['src/features/command/components/CommandMenu.tsx', 'command-menu', ['CommandMenu']],
	[
		'src/features/command/components/CommandMenuListPrimitives.tsx',
		'command-menu',
		[
			'CommandScrollableList',
			'CommandMenuList',
			'ProjectsCommandGroup',
			'CommandRow',
			'CommandRowMeta',
			'CommandRowSelectionTrailing',
			'CommandRowDigitHint',
		],
	],
	[
		'src/features/command/components/CommandMenuSelectionChips.tsx',
		'command-menu',
		['CommandMenuSelectionChips'],
	],
	[
		'src/features/command/components/ScopedPickerCommandGroup.tsx',
		'command-menu',
		['ScopedPickerCommandGroup'],
	],
	['src/features/command/components/ShortcutHelp.tsx', 'command-menu', ['ShortcutHelp']],
	[
		'src/features/danger-confirm/components/DangerConfirmDialog.tsx',
		'feedback-recovery',
		['DangerConfirmDialog'],
	],
	[
		'src/features/display-options/components/DisplayOptionsButton.tsx',
		'task-workspace',
		['DisplayOptionsButton'],
	],
	[
		'src/features/display-options/components/DisplayOptionsPanel.tsx',
		'task-workspace',
		['DisplayOptionsPanel'],
	],
	[
		'src/features/display-options/components/DisplayOptionsPopover.tsx',
		'task-workspace',
		['DisplayOptionsPopover'],
	],
	[
		'src/features/display-options/components/PropertyToggleGrid.tsx',
		'task-workspace',
		['PropertyToggleGrid'],
	],
	[
		'src/features/entity-detail/components/EntityDetailDrawerHost.tsx',
		'entity-detail',
		['EntityDetailDrawerHost'],
	],
	['src/features/filter/components/FilterBar.tsx', 'task-workspace', ['FilterBar']],
	['src/features/filter/components/FilterMenu.tsx', 'task-workspace', ['FilterMenu']],
	['src/features/filter/components/FilterValueOption.tsx', 'task-workspace', ['FilterValueOption']],
	[
		'src/features/filter/components/FilterValueSubMenu.tsx',
		'task-workspace',
		['FilterValueSubMenu'],
	],
	['src/features/filter/components/PageFilterButton.tsx', 'task-workspace', ['PageFilterButton']],
	[
		'src/features/global-search/components/GlobalSearchInput.tsx',
		'global-search',
		['GlobalSearchInput'],
	],
	[
		'src/features/global-search/components/GlobalSearchResults.tsx',
		'global-search',
		['GlobalSearchResults'],
	],
	['src/features/launcher/LauncherPage.tsx', 'launcher', ['LauncherPage']],
	['src/features/launcher/chrome/LauncherFooter.tsx', 'launcher', ['LauncherFooter']],
	['src/features/launcher/chrome/LauncherPanel.tsx', 'launcher', ['LauncherPanel']],
	['src/features/launcher/chrome/LauncherSurface.tsx', 'launcher', ['LauncherSurface']],
	['src/features/launcher/composer/AdvancedCollapse.tsx', 'launcher', ['AdvancedCollapse']],
	['src/features/launcher/composer/AdvancedMetaBar.tsx', 'launcher', ['AdvancedMetaBar']],
	['src/features/launcher/composer/PrimaryMetaBar.tsx', 'launcher', ['PrimaryMetaBar']],
	['src/features/launcher/composer/TitleInput.tsx', 'launcher', ['TitleInput']],
	['src/features/launcher/composer/controls/DateControl.tsx', 'launcher', ['DateControl']],
	[
		'src/features/launcher/composer/controls/PlacementControl.tsx',
		'launcher',
		['PlacementControl'],
	],
	['src/features/launcher/composer/controls/PriorityControl.tsx', 'launcher', ['PriorityControl']],
	['src/features/launcher/composer/controls/SpaceControl.tsx', 'launcher', ['SpaceControl']],
	['src/features/launcher/composer/controls/StatusControl.tsx', 'launcher', ['StatusControl']],
	['src/features/launcher/create/CreateRow.tsx', 'launcher', ['CreateRow']],
	['src/features/launcher/results/ContinuousToast.tsx', 'launcher', ['ContinuousToast']],
	['src/features/launcher/results/EmptyHint.tsx', 'launcher', ['EmptyHint', 'SearchEmptyHint']],
	['src/features/launcher/results/LauncherResults.tsx', 'launcher', ['LauncherResults']],
	['src/features/launcher/results/SectionLabel.tsx', 'launcher', ['SectionLabel']],
	[
		'src/features/launcher/results/adapters/ProjectResultRowAdapter.tsx',
		'launcher',
		['ProjectResultRowAdapter'],
	],
	[
		'src/features/launcher/results/adapters/TaskResultRowAdapter.tsx',
		'launcher',
		['TaskResultRowAdapter'],
	],
	['src/features/lifecycle/components/LifecycleBoard.tsx', 'collection-pages', ['LifecycleBoard']],
	[
		'src/features/lifecycle/components/LifecycleContextMenu.tsx',
		'collection-pages',
		['LifecycleContextMenu'],
	],
	['src/features/lifecycle/components/LifecycleList.tsx', 'collection-pages', ['LifecycleList']],
	[
		'src/features/lifecycle/components/LifecycleRowAdapter.tsx',
		'collection-pages',
		['LifecycleRowAdapter'],
	],
	[
		'src/features/metadata-fields/components/CustomDateDialog.tsx',
		'task-detail',
		['CustomDateDialog'],
	],
	[
		'src/features/metadata-fields/components/MetadataDateDropdown.tsx',
		'task-detail',
		['MetadataDateDropdown'],
	],
	[
		'src/features/metadata-fields/components/MetadataFieldButton.tsx',
		'task-detail',
		['MetadataFieldButton'],
	],
	[
		'src/features/metadata-fields/components/MetadataFieldDropdown.tsx',
		'task-detail',
		['MetadataFieldDropdown'],
	],
	[
		'src/features/metadata-fields/components/MetadataFieldMenuItem.tsx',
		'task-detail',
		['MetadataFieldMenuItem'],
	],
	[
		'src/features/metadata-fields/components/MetadataFieldValue.tsx',
		'task-detail',
		['MetadataFieldValue'],
	],
	[
		'src/features/metadata-fields/components/MetadataPlacementDropdown.tsx',
		'task-detail',
		['MetadataPlacementDropdown'],
	],
	[
		'src/features/metadata-fields/components/MetadataPlacementGroupList.tsx',
		'task-detail',
		['MetadataPlacementGroupList'],
	],
	[
		'src/features/project-overview/components/ProjectOverviewPage.tsx',
		'collection-pages',
		['ProjectOverviewPage'],
	],
	['src/features/project/components/ProjectBoard.tsx', 'collection-pages', ['ProjectBoard']],
	[
		'src/features/project/components/ProjectContextMenu.tsx',
		'collection-pages',
		['ProjectContextMenu'],
	],
	[
		'src/features/project/components/ProjectCreateContent.tsx',
		'create-dialogs',
		['ProjectCreateContent'],
	],
	['src/features/project/components/ProjectPage.tsx', 'collection-pages', ['ProjectPage']],
	[
		'src/features/project/components/ProjectRowAdapter.tsx',
		'collection-pages',
		['ProjectRowAdapter'],
	],
	['src/features/selection/components/CollectionGrid.tsx', 'task-board', ['CollectionGridRoot']],
	['src/features/settings/components/SettingsPage.tsx', 'settings-sync', ['SettingsPage']],
	['src/features/settings/components/SettingsSidebar.tsx', 'settings-sync', ['SettingsSidebar']],
	[
		'src/features/settings/components/panels/SettingsGeneralPanel.tsx',
		'settings-sync',
		['SettingsGeneralPanel'],
	],
	[
		'src/features/settings/components/panels/SettingsSidebarPanel.tsx',
		'settings-sync',
		['SettingsSidebarPanel'],
	],
	[
		'src/features/settings/components/panels/SettingsSyncPanel.presentation.tsx',
		'settings-sync',
		[
			'SyncMetricCard',
			'SyncTimestampValue',
			'SyncCursorValue',
			'SyncCountsSummaryValue',
			'SyncStatusBadge',
			'SyncReplicaBadge',
			'SyncCloudConfigBadge',
		],
	],
	[
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
		'settings-sync',
		['SettingsSyncPanel'],
	],
	[
		'src/features/settings/components/settingsShared.tsx',
		'settings-sync',
		[
			'SettingsStack',
			'SettingsSection',
			'SettingsToggleRow',
			'SettingInfoRow',
			'SettingsPreferenceGroup',
		],
	],
	['src/features/space/components/SpaceEditorDialog.tsx', 'space-editor', ['SpaceEditorDialog']],
	['src/features/sync/components/SyncConfigDialog.tsx', 'settings-sync', ['SyncConfigDialog']],
	[
		'src/features/sync/components/SyncFooterStatusItem.tsx',
		'settings-sync',
		['SyncFooterStatusItem'],
	],
	['src/features/task-workspace/components/TaskWorkspace.tsx', 'task-workspace', ['TaskWorkspace']],
	['src/features/task/components/TaskBoard.tsx', 'task-board', ['TaskBoard']],
	['src/features/task/components/TaskContextMenu.tsx', 'task-board', ['TaskContextMenu']],
	['src/features/task/components/TaskCreateContent.tsx', 'create-dialogs', ['TaskCreateContent']],
	[
		'src/features/task/components/TaskCreateMetaActions.tsx',
		'create-dialogs',
		['StatusMetaAction', 'PriorityMetaAction', 'PlacementMetaAction'],
	],
	['src/features/task/components/TaskListSceneView.tsx', 'task-board', ['TaskListSceneView']],
	['src/features/task/components/TaskRowAdapter.tsx', 'task-board', ['TaskRowAdapter']],
	[
		'src/features/task/components/TaskRowCells.tsx',
		'task-board',
		['TaskRowSelectionCell', 'TaskRowTitleCell', 'TaskRowCreatedAtCell'],
	],
	[
		'src/features/task/components/task-context-menu-items.tsx',
		'task-board',
		['PropertySubTrigger', 'PropertyOptionItem', 'MenuShortcut'],
	],
	['src/features/task/model/indicators/PriorityIcon.tsx', 'task-board', ['PriorityIcon']],
	[
		'src/features/task/model/indicators/TaskStatusIndicator.tsx',
		'task-board',
		['TaskStatusIndicator'],
	],
	[
		'src/features/task/detail/components/TaskActivityTimeline.tsx',
		'task-detail',
		['TaskActivityTimeline'],
	],
	[
		'src/features/task/detail/components/TaskAutosaveStatus.tsx',
		'task-detail',
		['TaskAutosaveStatus'],
	],
	[
		'src/features/task/detail/components/TaskDetailContent.tsx',
		'task-detail',
		['TaskDetailContent'],
	],
	['src/features/task/detail/components/TaskDetailHeader.tsx', 'task-detail', ['TaskDetailHeader']],
	['src/features/task/detail/components/TaskDrawerBody.tsx', 'task-detail', ['TaskDrawerBody']],
	['src/features/task/detail/components/TaskDrawerFooter.tsx', 'task-detail', ['TaskDrawerFooter']],
	[
		'src/features/task/detail/components/TaskLinkEditorPopover.tsx',
		'task-detail',
		['TaskLinkEditorPopover'],
	],
	['src/features/task/detail/components/TaskLinkList.tsx', 'task-detail', ['TaskLinkList']],
	['src/features/task/detail/components/TaskLinkRow.tsx', 'task-detail', ['TaskLinkRow']],
	['src/features/task/detail/components/TaskLinksSection.tsx', 'task-detail', ['TaskLinksSection']],
	['src/features/task/detail/components/TaskNoteField.tsx', 'task-detail', ['TaskNoteField']],
	['src/features/task/detail/components/TaskPage.tsx', 'task-detail', ['TaskPage']],
	['src/features/task/detail/components/TaskPageMain.tsx', 'task-detail', ['TaskPageMain']],
	['src/features/task/detail/components/TaskPageSidebar.tsx', 'task-detail', ['TaskPageSidebar']],
	['src/features/task/detail/components/TaskPageState.tsx', 'task-detail', ['TaskPageState']],
	['src/features/task/detail/components/TaskPreview.tsx', 'task-detail', ['TaskPreview']],
	[
		'src/features/task/detail/components/TaskPropertiesSection.tsx',
		'task-detail',
		['TaskPropertiesSection'],
	],
	['src/features/task/detail/components/TaskTitleField.tsx', 'task-detail', ['TaskTitleField']],
	[
		'src/features/update/components/SystemStatusChip.tsx',
		'feedback-recovery',
		['SystemStatusChip'],
	],
	['src/features/update/components/UpdateDialog.tsx', 'feedback-recovery', ['UpdateDialog']],
	[
		'src/features/update/components/UpdateFooterChip.tsx',
		'feedback-recovery',
		['UpdateFooterChip'],
	],
	[
		'src/features/update/components/UpdateSettingsSection.presentation.tsx',
		'feedback-recovery',
		['UpdateCheckModeOptions', 'UpdateChannelOptions', 'UpdateIntervalOptions'],
	],
	[
		'src/features/update/components/UpdateSettingsSection.tsx',
		'feedback-recovery',
		['UpdateSettingsSection'],
	],
	[
		'src/features/update/components/UpdateStatusFooterItem.tsx',
		'feedback-recovery',
		['UpdateStatusFooterItem'],
	],
	['src/features/view/components/SavedViewPage.tsx', 'collection-pages', ['SavedViewPage']],
	['src/features/view/components/ViewActionsMenu.tsx', 'collection-pages', ['ViewActionsMenu']],
	['src/features/view/components/ViewEditorDialog.tsx', 'collection-pages', ['ViewEditorDialog']],
	['src/features/view/components/ViewsPage.tsx', 'collection-pages', ['ViewsPage']],
	['src/layout/AppLayout.tsx', 'shell', ['AppLayout']],
	['src/layout/CreateDialogShell.tsx', 'create-dialogs', ['CreateDialogShell']],
	['src/layout/ShellBulkActionBoundary.tsx', 'shell', ['ShellBulkActionBoundary']],
	['src/layout/ShellChrome.tsx', 'shell', ['ShellChrome']],
	['src/layout/ShellFooter.tsx', 'shell', ['ShellFooter']],
	['src/layout/ShellHeader.tsx', 'shell', ['ShellHeader']],
	['src/layout/ShellLayoutContent.tsx', 'shell', ['ShellLayoutContent']],
	['src/layout/ShellLayoutSkeleton.tsx', 'shell', ['ShellLayoutSkeleton']],
	['src/layout/ShellMain.tsx', 'shell', ['ShellMain']],
	['src/layout/ShellRouteLayout.tsx', 'shell', ['ShellRouteLayout']],
	['src/layout/ShellSidebar.tsx', 'shell', ['ShellSidebar', 'ShellSidebarNavigation']],
	['src/layout/header/HistoryDropdown.tsx', 'shell', ['HistoryDropdown']],
	['src/layout/header/NavBackForward.tsx', 'shell', ['NavBackForward']],
	['src/layout/header/UserAppMenu.tsx', 'shell', ['UserAppMenu']],
	['src/layout/overlays/ShellOverlays.tsx', 'shell', ['ShellOverlays']],
	['src/layout/sidebar/MainNavRowContextMenu.tsx', 'shell', ['MainNavRowContextMenu']],
	['src/layout/sidebar/MainNavSidebarMenuItem.tsx', 'shell', ['MainNavSidebarMenuItem']],
	['src/layout/sidebar/ProjectNavMenuItem.tsx', 'shell', ['ProjectNavMenuItem']],
	['src/layout/sidebar/SidebarCustomizeSubmenu.tsx', 'shell', ['SidebarCustomizeSubmenu']],
	['src/layout/sidebar/SidebarItemContextMenu.tsx', 'shell', ['SidebarItemContextMenu']],
	['src/layout/sidebar/SidebarNavRow.tsx', 'shell', ['SidebarNavRow', 'SidebarProjectNavRow']],
	['src/layout/sidebar/SidebarResizeRail.tsx', 'shell', ['SidebarResizeRail']],
	['src/layout/sidebar/SpaceIconBadge.tsx', 'shell', ['SpaceIconBadge']],
	['src/layout/sidebar/StandaloneNavMenuItem.tsx', 'shell', ['StandaloneNavMenuItem']],
	['src/routes/-router-feedback.tsx', 'feedback-recovery', ['RouterFeedbackPage']],
	['src/shared/components/AppBreadcrumb.tsx', 'shell', ['AppBreadcrumb']],
	['src/shared/components/AppScrollArea.tsx', 'shell', ['AppScrollArea']],
	['src/shared/components/ShortcutTokens.tsx', 'shared-ui', ['ShortcutTokens']],
	[
		'src/shared/components/board/BoardLayout.tsx',
		'collection-rows',
		['BoardRowSlot', 'BoardSectionHeader'],
	],
	[
		'src/shared/components/board/BoardSectionContextMenu.tsx',
		'collection-rows',
		['BoardSectionContextMenu'],
	],
	['src/shared/components/create-modal-content.tsx', 'create-dialogs', ['CreateModalContent']],
	['src/shared/components/page-frame/PageFrame.tsx', 'shell', ['PageFrame']],
	['src/shared/components/row/RowLayout.tsx', 'collection-rows', ['RowLayout']],
	['src/shared/components/row/RowShell.tsx', 'collection-rows', ['RowShell']],
	['src/shared/components/tooltip/ActionTooltip.tsx', 'shared-ui', ['ActionTooltip']],
	[
		'src/shared/components/tooltip/DisabledActionTooltip.tsx',
		'shared-ui',
		['DisabledActionTooltip'],
	],
	['src/shared/components/tooltip/OverflowTooltip.tsx', 'shared-ui', ['OverflowTooltip']],
] as const satisfies readonly ComponentGroup[]

const PRIVATE_LEAF_GROUPS = [
	['src/features/bulk-action/components/BulkActionBar.tsx', 'BulkActionBar', ['BulkCommandButton']],
	[
		'src/features/command/components/CommandMenuListPrimitives.tsx',
		'CommandMenuList',
		['CommandMenuGroup', 'CommandMenuItem', 'CommandMenuShortcut'],
	],
	[
		'src/features/command/components/CommandMenuSelectionChips.tsx',
		'CommandMenuSelectionChips',
		['ReadonlySelectionSummaryChip'],
	],
	['src/features/command/components/ShortcutHelp.tsx', 'ShortcutHelp', ['ShortcutHelpRow']],
	[
		'src/features/display-options/components/DisplayOptionsPanel.tsx',
		'DisplayOptionsPanel',
		['OrderDirectionButton', 'DisplayOptionRow', 'CompactSelect'],
	],
	[
		'src/features/entity-detail/components/EntityDetailDrawerHost.tsx',
		'EntityDetailDrawerHost',
		['TaskEntityDetail'],
	],
	[
		'src/features/filter/components/FilterBar.tsx',
		'FilterBar',
		['FilterChip', 'OpPicker', 'ValuesPicker', 'FilterSaveDialog'],
	],
	[
		'src/features/global-search/components/GlobalSearchResults.tsx',
		'GlobalSearchResults',
		['SearchTaskResultRow', 'SearchProjectResultRow', 'SearchGroupHeading', 'SearchPanelState'],
	],
	['src/features/launcher/chrome/LauncherFooter.tsx', 'LauncherFooter', ['Hint']],
	['src/features/launcher/composer/controls/DateControl.tsx', 'DateControl', ['DatePresetButton']],
	['src/features/launcher/results/LauncherResults.tsx', 'LauncherResults', ['LauncherResultRow']],
	[
		'src/features/lifecycle/components/LifecycleBoard.tsx',
		'LifecycleBoard',
		['LifecycleBoardSectionBlock', 'LifecycleBoardLoading', 'LifecycleModeIcon'],
	],
	[
		'src/features/lifecycle/components/LifecycleRowAdapter.tsx',
		'LifecycleRowAdapter',
		['LifecycleEntityIcon'],
	],
	[
		'src/features/metadata-fields/components/CustomDateDialog.tsx',
		'CustomDateDialog',
		['CustomDateDialogContent'],
	],
	[
		'src/features/metadata-fields/components/MetadataFieldMenuItem.tsx',
		'MetadataFieldMenuItem',
		['MetadataFieldIndicatorIcon'],
	],
	[
		'src/features/project/components/ProjectBoard.tsx',
		'ProjectBoard',
		['ProjectBoardSection', 'ProjectBoardLoading', 'ProjectSectionStatusIcon'],
	],
	[
		'src/features/task/components/TaskBoard.tsx',
		'TaskBoard',
		['TaskBoardLoadingState', 'TaskBoardEmptyState', 'TaskBoardGridRow', 'StatusSectionHeader'],
	],
	['src/features/task/components/TaskRowAdapter.tsx', 'TaskRowAdapter', ['UpdatedAtCell']],
	[
		'src/features/task/components/task-context-menu-items.tsx',
		'PropertyOptionItem',
		['PropertyOptionIndicatorIcon'],
	],
	[
		'src/features/task/detail/components/TaskDetailContent.tsx',
		'TaskDetailContent',
		['TaskDetailState'],
	],
	['src/features/task/detail/components/TaskPage.tsx', 'TaskPage', ['TaskPageLoaded']],
	['src/features/task/detail/components/TaskPageSidebar.tsx', 'TaskPageSidebar', ['MetaRow']],
	['src/features/task/detail/components/TaskPreview.tsx', 'TaskPreview', ['MetaPill', 'StatusDot']],
	[
		'src/features/task/detail/components/TaskPropertiesSection.tsx',
		'TaskPropertiesSection',
		['TaskPropertyRow'],
	],
	['src/features/view/components/SavedViewPage.tsx', 'SavedViewPage', ['SavedViewPageState']],
	['src/features/view/components/ViewEditorDialog.tsx', 'ViewEditorDialog', ['DialogSelect']],
	[
		'src/features/view/components/ViewsPage.tsx',
		'ViewsPage',
		['SavedViewLibraryContent', 'LibraryEmptyState'],
	],
	['src/layout/CreateDialogShell.tsx', 'CreateDialogShell', ['CreateDialogSpaceSelector']],
	['src/layout/header/HistoryDropdown.tsx', 'HistoryDropdown', ['HistoryEntryItem']],
	['src/layout/header/UserAppMenu.tsx', 'UserAppMenu', ['MenuCommandShortcut']],
	['src/layout/sidebar/SidebarNavRow.tsx', 'SidebarNavRow', ['SidebarNavRowLayout']],
	['src/shared/components/AppBreadcrumb.tsx', 'AppBreadcrumb', ['BreadcrumbNodeItem']],
	[
		'src/shared/components/create-modal-content.tsx',
		'CreateModalContent',
		['Root', 'Title', 'Body', 'Metadata', 'Footer'],
	],
	[
		'src/shared/components/page-frame/PageFrame.tsx',
		'PageFrame',
		[
			'PageFrameRoot',
			'PageFrameHeader',
			'PageFrameToolbar',
			'PageFrameToolbarChoices',
			'PageFrameBody',
			'PageFrameCollectionBody',
		],
	],
	[
		'src/shared/components/tooltip/ActionTooltip.tsx',
		'ActionTooltip',
		['ActionTooltipRoot', 'ActionTooltipRow'],
	],
] as const satisfies readonly PrivateLeafGroup[]

function slug(value: string) {
	return value
		.replace(/([a-z0-9])([A-Z])/g, '$1-$2')
		.replace(/[^a-zA-Z0-9]+/g, '-')
		.toLowerCase()
		.replace(/^-|-$/g, '')
}

const EXISTING_REVIEW_IDS: Readonly<Record<string, string>> = {
	AppBreadcrumb: 'stoneflow-breadcrumb',
	PageFrame: 'page-frame-scene',
	RowShell: 'stoneflow-row-shell',
	SettingsSidebar: 'stoneflow-settings-navigation',
	ShellSidebar: 'stoneflow-shell-sidebar-scene',
	TaskBoard: 'stoneflow-task-board',
}

function componentId(name: string) {
	return EXISTING_REVIEW_IDS[name] ?? `stoneflow-component-${slug(name)}`
}

const EXPORTED_COMPONENT_CONSUMERS: Readonly<Record<string, readonly string[]>> = {
	'page-frame-scene': [
		'src/features/lifecycle/components/LifecycleList.tsx',
		'src/features/project-overview/components/ProjectOverviewPage.tsx',
		'src/features/project/components/ProjectPage.tsx',
		'src/features/settings/components/SettingsPage.tsx',
		'src/features/task-workspace/components/TaskWorkspace.tsx',
		'src/features/task/detail/components/TaskPage.tsx',
		'src/features/task/detail/components/TaskPageState.tsx',
		'src/features/view/components/SavedViewPage.tsx',
		'src/features/view/components/ViewsPage.tsx',
	],
	'stoneflow-breadcrumb': [
		'src/features/lifecycle/components/LifecycleList.tsx',
		'src/features/project-overview/components/ProjectOverviewPage.tsx',
		'src/features/project/components/ProjectPage.tsx',
		'src/features/settings/components/SettingsPage.tsx',
		'src/features/task/components/TaskListSceneView.tsx',
		'src/features/task/detail/components/TaskPage.tsx',
		'src/features/view/components/SavedViewPage.tsx',
		'src/features/view/components/ViewsPage.tsx',
	],
	'stoneflow-component-about-dialog': ['src/layout/overlays/ShellOverlays.tsx'],
	'stoneflow-component-action-tooltip': [
		'src/features/app-info/components/AboutDialog.tsx',
		'src/features/app-info/components/AppVersionFooterItem.tsx',
		'src/features/changelog/ChangelogDialog.tsx',
		'src/features/command/components/CommandActionTooltip.tsx',
		'src/features/command/components/ShortcutHelp.tsx',
		'src/features/display-options/components/DisplayOptionsPanel.tsx',
		'src/features/filter/components/FilterBar.tsx',
		'src/features/launcher/composer/PrimaryMetaBar.tsx',
		'src/features/launcher/composer/controls/PriorityControl.tsx',
		'src/features/launcher/composer/controls/SpaceControl.tsx',
		'src/features/metadata-fields/components/MetadataFieldDropdown.tsx',
		'src/features/metadata-fields/components/MetadataPlacementDropdown.tsx',
		'src/features/project-overview/components/ProjectOverviewPage.tsx',
		'src/features/project/components/ProjectPage.tsx',
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
		'src/features/task/components/TaskBoard.tsx',
		'src/features/task/components/TaskListSceneView.tsx',
		'src/features/task/components/TaskRowAdapter.tsx',
		'src/features/task/components/TaskRowCells.tsx',
		'src/features/update/components/UpdateDialog.tsx',
		'src/features/update/components/UpdateFooterChip.tsx',
		'src/features/view/components/SavedViewPage.tsx',
		'src/features/view/components/ViewActionsMenu.tsx',
		'src/features/view/components/ViewsPage.tsx',
		'src/layout/CreateDialogShell.tsx',
		'src/layout/header/HistoryDropdown.tsx',
		'src/layout/header/UserAppMenu.tsx',
		'src/shared/components/tooltip/DisabledActionTooltip.tsx',
	],
	'stoneflow-component-advanced-collapse': ['src/features/launcher/chrome/LauncherPanel.tsx'],
	'stoneflow-component-advanced-meta-bar': ['src/features/launcher/composer/AdvancedCollapse.tsx'],
	'stoneflow-component-app': ['src/main.tsx'],
	'stoneflow-component-app-layout': ['src/layout/ShellRouteLayout.tsx'],
	'stoneflow-component-app-scroll-area': ['src/shared/components/page-frame/PageFrame.tsx'],
	'stoneflow-component-app-version-footer-item': ['src/layout/ShellFooter.tsx'],
	'stoneflow-component-board-section-context-menu': [
		'src/features/lifecycle/components/LifecycleBoard.tsx',
		'src/features/project/components/ProjectBoard.tsx',
		'src/features/task/components/TaskBoard.tsx',
	],
	'stoneflow-component-board-row-slot': [
		'src/features/lifecycle/components/LifecycleBoard.tsx',
		'src/features/project/components/ProjectBoard.tsx',
		'src/features/task/components/TaskBoard.tsx',
	],
	'stoneflow-component-board-section-header': [
		'src/features/lifecycle/components/LifecycleBoard.tsx',
		'src/features/project/components/ProjectBoard.tsx',
		'src/features/task/components/TaskBoard.tsx',
	],
	'stoneflow-component-bulk-action-bar': ['src/layout/ShellLayoutContent.tsx'],
	'stoneflow-component-changelog-dialog': ['src/layout/overlays/ShellOverlays.tsx'],
	'stoneflow-component-changelog-markdown': ['src/features/changelog/ChangelogRelease.tsx'],
	'stoneflow-component-changelog-release': [
		'src/features/changelog/ChangelogDialog.tsx',
		'src/features/update/components/UpdateDialog.tsx',
	],
	'stoneflow-component-chord-hint': ['src/layout/ShellHeader.tsx'],
	'stoneflow-component-collection-grid-root': [
		'src/features/lifecycle/components/LifecycleBoard.tsx',
		'src/features/project/components/ProjectBoard.tsx',
	],
	'stoneflow-component-command-action-tooltip': [
		'src/features/bulk-action/components/BulkActionBar.tsx',
		'src/features/display-options/components/DisplayOptionsButton.tsx',
		'src/features/filter/components/FilterBar.tsx',
		'src/features/filter/components/PageFilterButton.tsx',
		'src/features/global-search/components/GlobalSearchInput.tsx',
		'src/features/project/components/ProjectCreateContent.tsx',
		'src/features/task/components/TaskCreateContent.tsx',
	],
	'stoneflow-component-command-menu': ['src/layout/ShellHeader.tsx'],
	'stoneflow-component-command-menu-list': ['src/features/command/components/CommandMenu.tsx'],
	'stoneflow-component-command-menu-selection-chips': [
		'src/features/command/components/CommandMenu.tsx',
	],
	'stoneflow-component-command-row': [
		'src/features/command/components/ScopedPickerCommandGroup.tsx',
	],
	'stoneflow-component-command-row-digit-hint': [
		'src/features/command/components/ScopedPickerCommandGroup.tsx',
	],
	'stoneflow-component-command-row-meta': [
		'src/features/command/components/ScopedPickerCommandGroup.tsx',
	],
	'stoneflow-component-command-row-selection-trailing': [
		'src/features/command/components/ScopedPickerCommandGroup.tsx',
	],
	'stoneflow-component-command-scrollable-list': [
		'src/features/command/components/CommandMenu.tsx',
	],
	'stoneflow-component-command-shortcut': [
		'src/features/filter/components/FilterMenu.tsx',
		'src/features/global-search/components/GlobalSearchInput.tsx',
		'src/features/metadata-fields/components/MetadataFieldDropdown.tsx',
		'src/features/metadata-fields/components/MetadataPlacementDropdown.tsx',
		'src/features/project-overview/components/ProjectOverviewPage.tsx',
		'src/features/task/components/TaskContextMenu.tsx',
		'src/features/task/components/TaskListSceneView.tsx',
		'src/features/task/components/TaskRowAdapter.tsx',
		'src/features/view/components/SavedViewPage.tsx',
	],
	'stoneflow-component-command-tooltip-row': [
		'src/layout/ShellHeader.tsx',
		'src/layout/ShellSidebar.tsx',
		'src/layout/header/NavBackForward.tsx',
		'src/layout/sidebar/SidebarNavRow.tsx',
	],
	'stoneflow-component-continuous-toast': ['src/features/launcher/chrome/LauncherPanel.tsx'],
	'stoneflow-component-create-dialog-shell': ['src/layout/overlays/ShellOverlays.tsx'],
	'stoneflow-component-create-modal-content': [
		'src/features/project/components/ProjectCreateContent.tsx',
		'src/features/task/components/TaskCreateContent.tsx',
	],
	'stoneflow-component-create-row': ['src/features/launcher/chrome/LauncherPanel.tsx'],
	'stoneflow-component-custom-date-dialog': ['src/layout/overlays/ShellOverlays.tsx'],
	'stoneflow-component-danger-confirm-dialog': [
		'src/features/danger-confirm/runtime/DangerConfirmProvider.tsx',
	],
	'stoneflow-component-date-control': ['src/features/launcher/composer/AdvancedMetaBar.tsx'],
	'stoneflow-component-disabled-action-tooltip': [
		'src/features/app-info/components/AboutDialog.tsx',
		'src/features/display-options/components/DisplayOptionsPanel.tsx',
		'src/features/launcher/composer/controls/PriorityControl.tsx',
		'src/features/metadata-fields/components/MetadataFieldDropdown.tsx',
		'src/features/metadata-fields/components/MetadataPlacementDropdown.tsx',
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
		'src/features/task/components/TaskRowCells.tsx',
		'src/features/update/components/UpdateDialog.tsx',
	],
	'stoneflow-component-disabled-command-action-tooltip': [
		'src/features/bulk-action/components/BulkActionBar.tsx',
		'src/features/project/components/ProjectCreateContent.tsx',
		'src/features/task/components/TaskCreateContent.tsx',
	],
	'stoneflow-component-display-options-button': [
		'src/features/task-workspace/components/TaskWorkspace.tsx',
	],
	'stoneflow-component-display-options-panel': [
		'src/features/display-options/components/DisplayOptionsPopover.tsx',
	],
	'stoneflow-component-display-options-popover': [
		'src/features/display-options/components/DisplayOptionsButton.tsx',
	],
	'stoneflow-component-empty-hint': ['src/features/launcher/results/LauncherResults.tsx'],
	'stoneflow-component-entity-detail-drawer-host': ['src/layout/ShellMain.tsx'],
	'stoneflow-component-filter-bar': ['src/features/task-workspace/components/TaskWorkspace.tsx'],
	'stoneflow-component-filter-menu': [
		'src/features/filter/components/FilterBar.tsx',
		'src/features/filter/components/PageFilterButton.tsx',
	],
	'stoneflow-component-filter-value-option': [
		'src/features/filter/components/FilterValueSubMenu.tsx',
	],
	'stoneflow-component-filter-value-sub-menu': ['src/features/filter/components/FilterMenu.tsx'],
	'stoneflow-component-global-search-input': ['src/layout/ShellHeader.tsx'],
	'stoneflow-component-global-search-results': [
		'src/features/global-search/components/GlobalSearchInput.tsx',
	],
	'stoneflow-component-history-dropdown': ['src/layout/ShellHeader.tsx'],
	'stoneflow-component-launcher-footer': ['src/features/launcher/chrome/LauncherPanel.tsx'],
	'stoneflow-component-launcher-page': ['src/launcher.tsx'],
	'stoneflow-component-launcher-panel': ['src/features/launcher/LauncherPage.tsx'],
	'stoneflow-component-launcher-results': ['src/features/launcher/chrome/LauncherPanel.tsx'],
	'stoneflow-component-launcher-surface': ['src/features/launcher/chrome/LauncherPanel.tsx'],
	'stoneflow-component-lifecycle-board': ['src/features/lifecycle/components/LifecycleList.tsx'],
	'stoneflow-component-lifecycle-context-menu': [
		'src/features/lifecycle/components/LifecycleRowAdapter.tsx',
	],
	'stoneflow-component-lifecycle-list': ['src/routes/_shell/-workspace-lifecycle.tsx'],
	'stoneflow-component-lifecycle-row-adapter': [
		'src/features/lifecycle/components/LifecycleBoard.tsx',
	],
	'stoneflow-component-main-nav-row-context-menu': [
		'src/layout/sidebar/MainNavSidebarMenuItem.tsx',
	],
	'stoneflow-component-main-nav-sidebar-menu-item': ['src/layout/ShellSidebar.tsx'],
	'stoneflow-component-menu-shortcut': ['src/features/task/components/TaskContextMenu.tsx'],
	'stoneflow-component-metadata-date-dropdown': [
		'src/features/task/components/TaskCreateContent.tsx',
		'src/features/task/components/TaskRowAdapter.tsx',
		'src/features/task/detail/components/TaskPropertiesSection.tsx',
	],
	'stoneflow-component-metadata-field-button': [
		'src/features/metadata-fields/components/MetadataFieldDropdown.tsx',
		'src/features/metadata-fields/components/MetadataPlacementDropdown.tsx',
	],
	'stoneflow-component-metadata-field-dropdown': [
		'src/features/metadata-fields/components/MetadataDateDropdown.tsx',
		'src/features/task/components/TaskCreateMetaActions.tsx',
		'src/features/task/components/TaskRowAdapter.tsx',
		'src/features/task/detail/components/TaskPropertiesSection.tsx',
	],
	'stoneflow-component-metadata-field-menu-item': [
		'src/features/metadata-fields/components/MetadataFieldDropdown.tsx',
		'src/features/metadata-fields/components/MetadataPlacementGroupList.tsx',
	],
	'stoneflow-component-metadata-field-value': ['src/features/task/components/TaskRowAdapter.tsx'],
	'stoneflow-component-metadata-placement-dropdown': [
		'src/features/task/components/TaskCreateMetaActions.tsx',
		'src/features/task/components/TaskRowAdapter.tsx',
		'src/features/task/detail/components/TaskPropertiesSection.tsx',
	],
	'stoneflow-component-metadata-placement-group-list': [
		'src/features/metadata-fields/components/MetadataPlacementDropdown.tsx',
	],
	'stoneflow-component-nav-back-forward': ['src/layout/ShellHeader.tsx'],
	'stoneflow-component-overflow-tooltip': [
		'src/features/command/components/CommandMenuListPrimitives.tsx',
		'src/features/command/components/ShortcutHelp.tsx',
		'src/features/filter/components/FilterBar.tsx',
		'src/features/filter/components/FilterValueOption.tsx',
		'src/features/launcher/chrome/LauncherFooter.tsx',
		'src/features/launcher/composer/controls/PlacementControl.tsx',
		'src/features/launcher/composer/controls/SpaceControl.tsx',
		'src/features/launcher/create/CreateRow.tsx',
		'src/features/launcher/results/adapters/ProjectResultRowAdapter.tsx',
		'src/features/launcher/results/adapters/TaskResultRowAdapter.tsx',
		'src/features/metadata-fields/components/MetadataFieldButton.tsx',
		'src/features/metadata-fields/components/MetadataFieldValue.tsx',
		'src/features/task/components/TaskBoard.tsx',
		'src/features/task/components/TaskRowCells.tsx',
		'src/features/task/detail/components/TaskDrawerFooter.tsx',
		'src/features/task/detail/components/TaskLinkRow.tsx',
		'src/features/task/detail/components/TaskPreview.tsx',
		'src/shared/components/AppBreadcrumb.tsx',
	],
	'stoneflow-component-page-filter-button': [
		'src/features/task-workspace/components/TaskWorkspace.tsx',
	],
	'stoneflow-component-placement-control': ['src/features/launcher/composer/PrimaryMetaBar.tsx'],
	'stoneflow-component-placement-meta-action': [
		'src/features/task/components/TaskCreateContent.tsx',
	],
	'stoneflow-component-primary-meta-bar': ['src/features/launcher/chrome/LauncherPanel.tsx'],
	'stoneflow-component-priority-control': ['src/features/launcher/composer/PrimaryMetaBar.tsx'],
	'stoneflow-component-priority-icon': [
		'src/features/filter/components/filterOptionCatalog.tsx',
		'src/features/global-search/components/GlobalSearchResults.tsx',
		'src/features/launcher/composer/controls/PriorityControl.tsx',
		'src/features/launcher/create/CreateRow.tsx',
		'src/features/launcher/results/adapters/TaskResultRowAdapter.tsx',
		'src/features/task/components/TaskContextMenu.tsx',
		'src/features/task/detail/components/TaskPreview.tsx',
		'src/features/task/detail/components/taskActivityTimelineModel.tsx',
		'src/features/task/model/registerTaskMetadataIcons.tsx',
	],
	'stoneflow-component-priority-meta-action': [
		'src/features/task/components/TaskCreateContent.tsx',
	],
	'stoneflow-component-project-board': [
		'src/features/project-overview/components/ProjectOverviewPage.tsx',
	],
	'stoneflow-component-project-context-menu': [
		'src/features/project/components/ProjectRowAdapter.tsx',
	],
	'stoneflow-component-project-create-content': ['src/layout/overlays/ShellOverlays.tsx'],
	'stoneflow-component-project-nav-menu-item': ['src/layout/ShellSidebar.tsx'],
	'stoneflow-component-project-overview-page': [
		'src/routes/_shell/-workspace-project-overview.tsx',
	],
	'stoneflow-component-project-page': ['src/routes/_shell/-workspace-project-detail.tsx'],
	'stoneflow-component-project-result-row-adapter': [
		'src/features/launcher/results/LauncherResults.tsx',
	],
	'stoneflow-component-project-row-adapter': ['src/features/project/components/ProjectBoard.tsx'],
	'stoneflow-component-projects-command-group': ['src/features/command/components/CommandMenu.tsx'],
	'stoneflow-component-property-option-item': ['src/features/task/components/TaskContextMenu.tsx'],
	'stoneflow-component-property-sub-trigger': ['src/features/task/components/TaskContextMenu.tsx'],
	'stoneflow-component-property-toggle-grid': [
		'src/features/display-options/components/DisplayOptionsPanel.tsx',
	],
	'stoneflow-component-router-feedback-page': [
		'src/routes/__root.tsx',
		'src/routes/_shell/route.tsx',
	],
	'stoneflow-component-saved-view-page': ['src/routes/_shell/-workspace-views.tsx'],
	'stoneflow-component-scoped-picker-command-group': [
		'src/features/command/components/CommandMenu.tsx',
	],
	'stoneflow-component-search-empty-hint': ['src/features/launcher/results/LauncherResults.tsx'],
	'stoneflow-component-section-label': [
		'src/features/launcher/chrome/LauncherPanel.tsx',
		'src/features/launcher/results/LauncherResults.tsx',
	],
	'stoneflow-component-setting-info-row': [
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-settings-general-panel': [
		'src/features/settings/components/SettingsPage.tsx',
	],
	'stoneflow-component-settings-page': ['src/routes/_shell/-workspace-settings-section.tsx'],
	'stoneflow-component-settings-preference-group': [
		'src/features/settings/components/panels/SettingsSidebarPanel.tsx',
	],
	'stoneflow-component-settings-section': [
		'src/features/settings/components/SettingsPage.tsx',
		'src/features/settings/components/panels/SettingsGeneralPanel.tsx',
		'src/features/settings/components/panels/SettingsSidebarPanel.tsx',
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-settings-sidebar-panel': [
		'src/features/settings/components/SettingsPage.tsx',
	],
	'stoneflow-component-settings-stack': [
		'src/features/settings/components/SettingsPage.tsx',
		'src/features/settings/components/panels/SettingsGeneralPanel.tsx',
		'src/features/settings/components/panels/SettingsSidebarPanel.tsx',
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-settings-sync-panel': ['src/features/settings/components/SettingsPage.tsx'],
	'stoneflow-component-settings-toggle-row': [
		'src/features/settings/components/panels/SettingsSidebarPanel.tsx',
	],
	'stoneflow-component-shell-bulk-action-boundary': ['src/layout/AppLayout.tsx'],
	'stoneflow-component-shell-chrome': ['src/layout/ShellLayoutContent.tsx'],
	'stoneflow-component-shell-footer': ['src/layout/ShellChrome.tsx'],
	'stoneflow-component-shell-header': ['src/layout/ShellChrome.tsx'],
	'stoneflow-component-shell-layout-content': ['src/layout/ShellBulkActionBoundary.tsx'],
	'stoneflow-component-shell-layout-skeleton': [
		'src/layout/ShellLayoutContent.tsx',
		'src/routes/index.tsx',
	],
	'stoneflow-component-shell-main': ['src/layout/ShellChrome.tsx'],
	'stoneflow-component-shell-overlays': ['src/layout/ShellLayoutContent.tsx'],
	'stoneflow-component-shell-route-layout': ['src/routes/_shell/-scoped-shell-route-layout.tsx'],
	'stoneflow-component-shortcut-help': ['src/layout/ShellHeader.tsx'],
	'stoneflow-component-shortcut-tokens': [
		'src/features/command/components/ChordHint.tsx',
		'src/features/command/components/CommandActionTooltip.tsx',
		'src/features/command/components/CommandMenuListPrimitives.tsx',
		'src/features/command/components/ShortcutHelp.tsx',
		'src/features/launcher/chrome/LauncherFooter.tsx',
		'src/layout/header/UserAppMenu.tsx',
	],
	'stoneflow-component-sidebar-customize-submenu': [
		'src/layout/ShellSidebar.tsx',
		'src/layout/sidebar/SidebarItemContextMenu.tsx',
	],
	'stoneflow-component-sidebar-item-context-menu': [
		'src/layout/ShellSidebar.tsx',
		'src/layout/sidebar/MainNavRowContextMenu.tsx',
	],
	'stoneflow-component-sidebar-nav-row': [
		'src/layout/ShellSidebar.tsx',
		'src/layout/sidebar/MainNavSidebarMenuItem.tsx',
		'src/layout/sidebar/StandaloneNavMenuItem.tsx',
	],
	'stoneflow-component-sidebar-project-nav-row': ['src/layout/sidebar/ProjectNavMenuItem.tsx'],
	'stoneflow-component-sidebar-resize-rail': ['src/layout/ShellChrome.tsx'],
	'stoneflow-component-space-control': ['src/features/launcher/composer/PrimaryMetaBar.tsx'],
	'stoneflow-component-space-editor-dialog': ['src/layout/ShellSidebar.tsx'],
	'stoneflow-component-space-icon-badge': ['src/layout/ShellSidebar.tsx'],
	'stoneflow-component-standalone-nav-menu-item': ['src/layout/ShellSidebar.tsx'],
	'stoneflow-component-status-control': ['src/features/launcher/composer/AdvancedMetaBar.tsx'],
	'stoneflow-component-status-meta-action': ['src/features/task/components/TaskCreateContent.tsx'],
	'stoneflow-component-sync-cloud-config-badge': [
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-sync-config-dialog': [
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-sync-counts-summary-value': [
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-sync-cursor-value': [
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-sync-footer-status-item': ['src/layout/ShellFooter.tsx'],
	'stoneflow-component-sync-metric-card': [
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-sync-replica-badge': [
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-sync-status-badge': [
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-sync-timestamp-value': [
		'src/features/settings/components/panels/SettingsSyncPanel.tsx',
	],
	'stoneflow-component-system-status-chip': ['src/layout/overlays/ShellOverlays.tsx'],
	'stoneflow-component-task-activity-timeline': [
		'src/features/task/detail/components/TaskPageMain.tsx',
	],
	'stoneflow-component-task-autosave-status': [
		'src/features/task/detail/components/TaskDetailHeader.tsx',
		'src/features/task/detail/components/TaskPage.tsx',
	],
	'stoneflow-component-task-context-menu': ['src/features/task/components/TaskRowAdapter.tsx'],
	'stoneflow-component-task-create-content': ['src/layout/overlays/ShellOverlays.tsx'],
	'stoneflow-component-task-detail-content': [
		'src/features/entity-detail/components/EntityDetailDrawerHost.tsx',
	],
	'stoneflow-component-task-detail-header': [
		'src/features/task/detail/components/TaskDetailContent.tsx',
	],
	'stoneflow-component-task-drawer-body': [
		'src/features/task/detail/components/TaskDetailContent.tsx',
	],
	'stoneflow-component-task-drawer-footer': [
		'src/features/task/detail/components/TaskDetailContent.tsx',
	],
	'stoneflow-component-task-link-editor-popover': [
		'src/features/task/detail/components/TaskLinkRow.tsx',
		'src/features/task/detail/components/TaskLinksSection.tsx',
	],
	'stoneflow-component-task-link-list': [
		'src/features/task/detail/components/TaskLinksSection.tsx',
	],
	'stoneflow-component-task-link-row': ['src/features/task/detail/components/TaskLinkList.tsx'],
	'stoneflow-component-task-links-section': [
		'src/features/task/detail/components/TaskDrawerBody.tsx',
		'src/features/task/detail/components/TaskPageMain.tsx',
	],
	'stoneflow-component-task-list-scene-view': ['src/routes/_shell/-workspace-task-list.tsx'],
	'stoneflow-component-task-note-field': [
		'src/features/task/detail/components/TaskDrawerBody.tsx',
		'src/features/task/detail/components/TaskPageMain.tsx',
	],
	'stoneflow-component-task-page': ['src/routes/_shell/-workspace-task-detail.tsx'],
	'stoneflow-component-task-page-main': ['src/features/task/detail/components/TaskPage.tsx'],
	'stoneflow-component-task-page-sidebar': ['src/features/task/detail/components/TaskPage.tsx'],
	'stoneflow-component-task-page-state': [
		'src/features/task/detail/components/TaskPage.tsx',
		'src/routes/_shell/-detail-route-helpers.tsx',
	],
	'stoneflow-component-task-preview': ['src/layout/ShellMain.tsx'],
	'stoneflow-component-task-properties-section': [
		'src/features/task/detail/components/TaskDrawerBody.tsx',
		'src/features/task/detail/components/TaskPageSidebar.tsx',
	],
	'stoneflow-component-task-result-row-adapter': [
		'src/features/launcher/results/LauncherResults.tsx',
	],
	'stoneflow-component-task-row-adapter': ['src/features/task/components/TaskBoard.tsx'],
	'stoneflow-component-task-row-created-at-cell': [
		'src/features/task/components/TaskRowAdapter.tsx',
	],
	'stoneflow-component-task-row-selection-cell': [
		'src/features/task/components/TaskRowAdapter.tsx',
	],
	'stoneflow-component-task-row-title-cell': ['src/features/task/components/TaskRowAdapter.tsx'],
	'stoneflow-component-task-status-indicator': [
		'src/features/filter/components/filterOptionCatalog.tsx',
		'src/features/global-search/components/GlobalSearchResults.tsx',
		'src/features/launcher/composer/controls/StatusControl.tsx',
		'src/features/launcher/create/CreateRow.tsx',
		'src/features/launcher/results/adapters/TaskResultRowAdapter.tsx',
		'src/features/task/components/TaskBoard.tsx',
		'src/features/task/components/TaskContextMenu.tsx',
		'src/features/task/detail/components/taskActivityTimelineModel.tsx',
		'src/features/task/model/registerTaskMetadataIcons.tsx',
	],
	'stoneflow-component-task-title-field': [
		'src/features/task/detail/components/TaskDrawerBody.tsx',
		'src/features/task/detail/components/TaskPageMain.tsx',
	],
	'stoneflow-component-task-workspace': [
		'src/features/project/components/ProjectPage.tsx',
		'src/features/task/components/TaskListSceneView.tsx',
		'src/features/view/components/SavedViewPage.tsx',
	],
	'stoneflow-component-title-input': ['src/features/launcher/composer/PrimaryMetaBar.tsx'],
	'stoneflow-component-update-channel-options': [
		'src/features/update/components/UpdateSettingsSection.tsx',
	],
	'stoneflow-component-update-check-mode-options': [
		'src/features/update/components/UpdateSettingsSection.tsx',
	],
	'stoneflow-component-update-dialog': ['src/layout/overlays/ShellOverlays.tsx'],
	'stoneflow-component-update-footer-chip': [
		'src/features/update/components/UpdateStatusFooterItem.tsx',
	],
	'stoneflow-component-update-interval-options': [
		'src/features/update/components/UpdateSettingsSection.tsx',
	],
	'stoneflow-component-update-settings-section': [
		'src/features/settings/components/SettingsPage.tsx',
	],
	'stoneflow-component-update-status-footer-item': ['src/layout/ShellFooter.tsx'],
	'stoneflow-component-user-app-menu': ['src/layout/ShellHeader.tsx'],
	'stoneflow-component-view-actions-menu': [
		'src/features/view/components/SavedViewPage.tsx',
		'src/features/view/components/ViewsPage.tsx',
	],
	'stoneflow-component-view-editor-dialog': [
		'src/features/view/components/SavedViewPage.tsx',
		'src/features/view/components/ViewsPage.tsx',
	],
	'stoneflow-component-views-page': ['src/routes/_shell/-workspace-views.tsx'],
	'stoneflow-row-shell': [
		'src/features/lifecycle/components/LifecycleRowAdapter.tsx',
		'src/features/project/components/ProjectRowAdapter.tsx',
		'src/features/task/components/TaskRowAdapter.tsx',
	],
	'stoneflow-component-row-layout': [
		'src/features/lifecycle/components/LifecycleRowAdapter.tsx',
		'src/features/project/components/ProjectRowAdapter.tsx',
		'src/features/task/components/TaskRowAdapter.tsx',
	],
	'stoneflow-settings-navigation': ['src/layout/ShellChrome.tsx'],
	'stoneflow-component-shell-sidebar-navigation': ['src/layout/ShellSidebar.tsx'],
	'stoneflow-shell-sidebar-scene': ['src/layout/ShellChrome.tsx'],
	'stoneflow-task-board': [
		'src/features/project/components/ProjectPage.tsx',
		'src/features/task/components/TaskListSceneView.tsx',
		'src/features/view/components/SavedViewPage.tsx',
	],
}

const PRIVATE_INGREDIENTS_BY_PARENT = new Map<string, string[]>()
for (const [, compositionParentName, names] of PRIVATE_LEAF_GROUPS) {
	PRIVATE_INGREDIENTS_BY_PARENT.set(componentId(compositionParentName), names.map(componentId))
}

const HEROUI_INGREDIENTS_BY_CONSUMER = new Map<string, string[]>()
for (const registration of HEROUI_REGISTRATIONS) {
	if (registration.exportKind === 'type') continue
	for (const consumer of registration.consumers) {
		const ingredients = HEROUI_INGREDIENTS_BY_CONSUMER.get(consumer) ?? []
		ingredients.push(registration.id)
		HEROUI_INGREDIENTS_BY_CONSUMER.set(consumer, ingredients)
	}
}

const EXPORTED_COMPONENT_REGISTRATIONS: readonly StoneFlowCatalogRegistration[] =
	EXPORTED_COMPONENT_GROUPS.flatMap(([definitionPath, compositionParent, names]) =>
		names.map((name) => {
			const id = componentId(name)
			const consumers = EXPORTED_COMPONENT_CONSUMERS[id]
			if (!consumers) throw new Error(`StoneFlow component ${id} 缺少直接消费者登记`)
			return {
				id,
				kind: 'component' as const,
				name,
				definitionPath,
				consumers,
				compositionParent: `stoneflow-scene-${compositionParent}`,
				ingredients: [
					...(PRIVATE_INGREDIENTS_BY_PARENT.get(id) ?? []),
					...(HEROUI_INGREDIENTS_BY_CONSUMER.get(definitionPath) ?? []),
				],
				owner: 'Product' as const,
				recommendedOwner: 'Product' as const,
				disposition: 'keep' as const,
				adoption: 'used' as const,
				coverage: 'covered-in-composition' as const,
				reason: `生产静态可达；由 ${compositionParent} 组合覆盖，不为总账完整度重复创建独立预览。`,
				verification: '静态可达：src/main.tsx / src/launcher.tsx；交互由对应产品组合验收。',
			}
		}),
	)

const PRIVATE_LEAF_REGISTRATIONS: readonly StoneFlowCatalogRegistration[] =
	PRIVATE_LEAF_GROUPS.flatMap(([definitionPath, compositionParentName, names]) =>
		names.map((name) => ({
			id: componentId(name),
			kind: 'component' as const,
			name,
			definitionPath,
			consumers: [definitionPath],
			compositionParent: componentId(compositionParentName),
			ingredients: [],
			owner: 'Product' as const,
			recommendedOwner: 'Product' as const,
			disposition: 'keep' as const,
			adoption: 'used' as const,
			coverage: 'covered-in-composition' as const,
			reason: `私有叶子组件；由 ${compositionParentName} 在同一实现边界内覆盖。`,
			verification: `静态定义与消费者均位于 ${definitionPath}；随父组合验收。`,
		})),
	)

function scene(
	id: ProductSceneId,
	name: string,
	definitionPath: string,
	consumers: readonly string[],
	ingredients: readonly string[],
	coverage: StoneFlowRegistrationCoverage,
	reason: string,
	upstreamIngredients: readonly string[],
): StoneFlowCatalogRegistration {
	return {
		id: `stoneflow-scene-${id}`,
		kind: 'product-scene',
		name,
		definitionPath,
		consumers,
		compositionParent: null,
		ingredients: [...ingredients.map(componentId), ...upstreamIngredients],
		owner: 'Product',
		recommendedOwner: 'Product',
		disposition: coverage === 'real-app-only' ? 'real-app-only' : 'keep',
		adoption: 'used',
		coverage,
		reason,
		verification:
			coverage === 'real-app-only'
				? '目录由静态源码确认；窗口、WebView、Portal 与真实命令只由 Tauri 应用验收。'
				: '目录由静态源码确认；视觉与交互由对应 UI Lab 产品组合及真实应用共同验收。',
	}
}

const REQUIRED_PRODUCT_SCENE_REGISTRATIONS = [
	scene(
		'shell',
		'Shell + Sidebar + Breadcrumb + PageFrame',
		'src/layout/ShellChrome.tsx',
		['src/layout/ShellLayoutContent.tsx'],
		['ShellChrome', 'ShellSidebar', 'AppBreadcrumb', 'PageFrame'],
		'real-app-only',
		'可在 Lab 复用公共片段；完整 Router、窗口几何、Portal 与 WebView 激活只能在主窗口验收。',
		[
			'heroui-pro-sidebar',
			'heroui-breadcrumbs',
			'heroui-oss-scroll-shadow',
			'heroui-oss-surface',
			'heroui-button',
			'heroui-tooltip',
		],
	),
	scene(
		'task-board',
		'TaskBoard + Group Header + Task Row + bulk ActionBar',
		'src/features/task/components/TaskBoard.tsx',
		[
			'src/features/task-workspace/components/TaskWorkspace.tsx',
			'src/layout/ShellLayoutContent.tsx',
		],
		[
			'TaskBoard',
			'StatusSectionHeader',
			'BoardSectionHeader',
			'BoardRowSlot',
			'TaskRowAdapter',
			'RowShell',
			'RowLayout',
			'BulkActionBar',
		],
		'covered-in-composition',
		'由生产公开组件组合覆盖；虚拟化、连续选择与命令运行时不在 Lab 重写。',
		[
			'heroui-pro-action-bar',
			'heroui-oss-checkbox',
			'heroui-button',
			'heroui-oss-chip',
			'heroui-pro-context-menu',
			'heroui-empty-state',
			'heroui-oss-skeleton',
		],
	),
	scene(
		'task-detail',
		'Task Detail + Metadata + Timeline',
		'src/features/task/detail/components/TaskDetailContent.tsx',
		[
			'src/features/entity-detail/components/EntityDetailDrawerHost.tsx',
			'src/features/task/detail/components/TaskPage.tsx',
		],
		['TaskDetailContent', 'TaskPropertiesSection', 'MetadataFieldDropdown', 'TaskActivityTimeline'],
		'covered-in-composition',
		'由任务详情公开组件覆盖；真实 Autosave、Query 与持久化仍在产品路径验收。',
		[
			'heroui-pro-timeline',
			'heroui-button',
			'heroui-oss-card',
			'heroui-oss-separator',
			'heroui-oss-surface',
			'heroui-oss-scroll-shadow',
		],
	),
	scene(
		'global-search',
		'Global Search',
		'src/features/global-search/components/GlobalSearchInput.tsx',
		['src/layout/ShellHeader.tsx'],
		['GlobalSearchInput', 'GlobalSearchResults'],
		'covered-in-composition',
		'搜索输入、结果、空态与键盘路径由真实生产组件覆盖。',
		['heroui-search-field-candidate', 'heroui-list-view', 'heroui-oss-surface'],
	),
	scene(
		'settings-sync',
		'Settings + sync config',
		'src/features/settings/components/SettingsPage.tsx',
		['src/routes/_shell/-workspace-settings-section.tsx'],
		['SettingsPage', 'SettingsSidebar', 'SettingsSyncPanel', 'SyncConfigDialog'],
		'covered-in-composition',
		'设置结构与同步状态可用本地状态覆盖；真实同步和持久化不在 Lab 执行。',
		[
			'heroui-pro-sidebar',
			'heroui-pro-cell-select',
			'heroui-pro-cell-switch',
			'heroui-oss-disclosure',
			'heroui-oss-number-field',
			'heroui-oss-card',
		],
	),
	scene(
		'entity-detail',
		'Entity Detail Resizable / Sheet',
		'src/features/entity-detail/components/EntityDetailDrawerHost.tsx',
		['src/layout/ShellMain.tsx'],
		['EntityDetailDrawerHost', 'TaskDetailContent'],
		'real-app-only',
		'Resizable/Sheet 结构可对照；断点、Portal 容器、窗口几何与焦点恢复需真实应用验收。',
		['heroui-pro-resizable', 'heroui-pro-sheet', 'heroui-oss-surface'],
	),
	scene(
		'launcher',
		'Launcher',
		'src/features/launcher/LauncherPage.tsx',
		['src/launcher.tsx'],
		['LauncherPage', 'LauncherPanel', 'LauncherSurface', 'LauncherResults'],
		'real-app-only',
		'内容表面可登记；窗口激活、全局快捷键、原生关闭与真实提交只能在 Launcher 窗口验收。',
		[
			'heroui-oss-surface',
			'heroui-oss-scroll-shadow',
			'heroui-button',
			'heroui-input',
			'heroui-oss-dropdown',
			'heroui-oss-popover',
		],
	),
	scene(
		'feedback-recovery',
		'Update + Danger Confirm + Toast / recovery',
		'src/layout/overlays/ShellOverlays.tsx',
		['src/layout/ShellLayoutContent.tsx'],
		['UpdateDialog', 'DangerConfirmDialog', 'SystemStatusChip', 'ContinuousToast'],
		'real-app-only',
		'反馈视觉可用本地状态覆盖；真实更新、删除、下载、Toast 队列与 Tauri 命令不在 Lab 执行。',
		[
			'heroui-oss-alert',
			'heroui-oss-alert-dialog',
			'heroui-oss-toast',
			'heroui-oss-toast-function',
			'heroui-empty-state',
			'heroui-oss-progress-bar',
			'heroui-oss-progress-circle',
			'heroui-oss-spinner',
		],
	),
	scene(
		'space-editor',
		'Space Editor + ColorSwatchPicker',
		'src/features/space/components/SpaceEditorDialog.tsx',
		['src/layout/ShellSidebar.tsx'],
		['SpaceEditorDialog'],
		'covered-in-composition',
		'Space Editor 公开表单与颜色选择器由生产组件覆盖；Lab 不持久化 Space。',
		[
			'heroui-color-swatch-picker-ledger',
			'heroui-oss-list-box',
			'heroui-select',
			'heroui-modal',
			'heroui-input',
		],
	),
] as const satisfies readonly StoneFlowCatalogRegistration[]

const COVERAGE_SCENES = [
	['main-app', 'Main App'],
	['command-menu', 'Command Menu'],
	['task-workspace', 'Task Workspace'],
	['collection-pages', 'Collection Pages'],
	['create-dialogs', 'Create Dialogs'],
	['shared-ui', 'Shared UI'],
	['collection-rows', 'Collection Rows'],
] as const satisfies readonly (readonly [ProductSceneId, string])[]

const COVERAGE_SCENE_REGISTRATIONS: readonly StoneFlowCatalogRegistration[] = COVERAGE_SCENES.map(
	([id, name]) => {
		const sceneId = `stoneflow-scene-${id}`
		return {
			id: sceneId,
			kind: 'product-scene',
			name,
			definitionPath: PRODUCT_SCENE_PATHS[id],
			consumers: ['src/main.tsx'],
			compositionParent: null,
			ingredients: EXPORTED_COMPONENT_REGISTRATIONS.filter(
				(registration) => registration.compositionParent === sceneId,
			).map((registration) => registration.id),
			owner: 'Product',
			recommendedOwner: 'Product',
			disposition: 'keep',
			adoption: 'used',
			coverage: 'covered-in-composition',
			reason: '用于连接生产组件与其真实组合边界；不为目录完整度复制页面运行时。',
			verification: '静态可达：src/main.tsx；行为由对应产品路径验收。',
		}
	},
)

export const STONEFLOW_PRODUCT_SCENE_REGISTRATIONS: readonly StoneFlowCatalogRegistration[] = [
	...REQUIRED_PRODUCT_SCENE_REGISTRATIONS,
	...COVERAGE_SCENE_REGISTRATIONS,
]

export const STONEFLOW_COMPONENT_REGISTRATIONS: readonly StoneFlowCatalogRegistration[] = [
	...EXPORTED_COMPONENT_REGISTRATIONS,
	...PRIVATE_LEAF_REGISTRATIONS,
]

export const STONEFLOW_CATALOG_REGISTRATIONS: readonly StoneFlowCatalogRegistration[] = [
	...STONEFLOW_COMPONENT_REGISTRATIONS,
	...STONEFLOW_PRODUCT_SCENE_REGISTRATIONS,
]
