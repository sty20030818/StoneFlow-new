/**
 * @fileoverview **shell-dialogs · 壳级对话框 / 命令菜单 UI 状态**
 *
 * 供 layout 与 features 共享；不持有业务规则，仅 open/close 与草稿壳状态。
 */

export {
	useDialogStore,
	selectIsCommandOpen,
	selectCommandMenuMode,
	selectCommandSelectionOverride,
	selectCommandMenuFilterKind,
	selectIsShortcutHelpOpen,
	selectCreateDialogType,
	selectTaskCreateDraft,
	selectTaskCreatePresentation,
	selectCustomDateDialog,
	type CreateDialogPresentation,
	type CustomDateDialogState,
} from './useDialogStore'

export {
	useShellPreferenceStore,
	selectProjectTaskBoardOpenSections,
} from './useShellPreferenceStore'
