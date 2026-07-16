import type { ShellCommandActions } from '@/features/command'

/**
 * 合并各 slice 的 Partial actions 为完整 ShellCommandActions。
 * 缺字段时在开发环境抛错，避免静默 undefined 运行时炸掉。
 */
export function composeShellCommandActions(
	...slices: Array<Partial<ShellCommandActions>>
): ShellCommandActions {
	const merged = Object.assign({}, ...slices) as Partial<ShellCommandActions>

	if (import.meta.env.DEV) {
		const required: Array<keyof ShellCommandActions> = [
			'openCommandMenu',
			'openShortcutHelp',
			'focusSearch',
			'openQuickTaskCreate',
			'openFullTaskCreate',
			'openInboxTaskCreate',
			'openProjectCreate',
			'openTaskPicker',
			'openProjectPicker',
			'openTaskPlacementPicker',
			'applyTaskPlacement',
			'openTaskPriorityPicker',
			'openTaskStatusPicker',
			'openTaskDatePicker',
			'completeSelectedTasks',
			'requestArchiveSelectedTasks',
			'requestDeleteSelectedTasks',
			'requestArchiveSelectedProjects',
			'requestDeleteSelectedProjects',
			'restoreSelectedLifecycleEntries',
			'requestDeleteSelectedLifecycleEntries',
			'requestDeletePermanentlySelectedLifecycleEntries',
			'navigateTo',
			'closeCurrentLayer',
			'submitActiveForm',
			'submitAndContinue',
			'submitAndOpen',
			'toggleSidebar',
			'togglePreview',
			'openFilterPicker',
			'toggleCompletedFilter',
			'clearAllFilters',
			'goBack',
			'goForward',
		]
		const missing = required.filter((key) => typeof merged[key] !== 'function')
		if (missing.length > 0) {
			throw new Error(`ShellCommandActions 缺少切片方法: ${missing.join(', ')}`)
		}
	}

	return merged as ShellCommandActions
}
