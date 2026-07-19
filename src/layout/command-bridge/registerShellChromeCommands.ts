import { startTransition } from 'react'

import { openShellNavigationTarget } from '@/app/navigation'
import type { CommandHostContext, ShellCommandActions } from '@/features/command'
import { useDialogStore } from '@/features/shell-dialogs'
import { requestSidebarToggle } from '@/shared/components/base/sidebar'
import type { ShellNavigationTarget } from '@/shared/types'

/**
 * 壳铬架相关命令（不属于任何 domain feature）：
 * 打开命令板/帮助/搜索、新建 dialog 宿主、Esc 关层优先级、侧栏与路径导航。
 * 不包含任务完成/归档等业务规则。
 */
export function registerShellChromeCommands(
	host: Pick<
		CommandHostContext,
		| 'toggleShortcutHelp'
		| 'requestSearchFocus'
		| 'handleOpenTaskCreate'
		| 'openTaskCreateDialog'
		| 'openProjectCreateDialog'
		| 'isShortcutHelpOpen'
		| 'createDialogType'
		| 'closeTaskCreateDialog'
		| 'closeProjectCreateDialog'
		| 'activeDetail'
		| 'closeEntityDrawer'
		| 'taskPreviewController'
		| 'isCommandOpen'
		| 'canGoBack'
		| 'goBack'
		| 'goForward'
		| 'navigate'
		| 'currentScope'
		| 'currentSpaceId'
	>,
): Partial<ShellCommandActions> {
	return {
		openCommandMenu: () => {
			useDialogStore.getState().openCommand('default')
		},
		openShortcutHelp: () => {
			host.toggleShortcutHelp()
		},
		focusSearch: host.requestSearchFocus,
		openQuickTaskCreate: host.handleOpenTaskCreate,
		openFullTaskCreate: () => host.openTaskCreateDialog(undefined, 'default'),
		openInboxTaskCreate: () => host.openTaskCreateDialog({ placement: 'inbox' }, 'default'),
		openProjectCreate: () => host.openProjectCreateDialog(),
		openTaskPicker: () => {
			useDialogStore.getState().openCommand('task-picker')
		},
		openProjectPicker: () => {
			useDialogStore.getState().openCommand('project-picker')
		},
		closeCurrentLayer: (ctx) => {
			if (host.isShortcutHelpOpen) {
				useDialogStore.getState().closeShortcutHelp()
				return
			}
			if (host.createDialogType === 'task') {
				host.closeTaskCreateDialog()
				return
			}
			if (host.createDialogType === 'project') {
				host.closeProjectCreateDialog()
				return
			}
			if (host.activeDetail) {
				host.closeEntityDrawer()
				return
			}
			if (host.taskPreviewController.previewState.open) {
				host.taskPreviewController.closePreview()
				return
			}
			if (host.isCommandOpen) {
				useDialogStore.getState().closeCommand()
				return
			}
			if (ctx.selection.hasSelection) {
				ctx.selection.clearSelection?.()
				return
			}
			// Settings Mode：会话历史不跟踪 settings，Esc 应走 returnPath，而非无效 goBack
			if (host.isSettingsMode && host.settingsReturnPath) {
				void host.navigate({ to: host.settingsReturnPath as never })
				return
			}
			if (host.canGoBack) {
				host.goBack()
			}
		},
		toggleSidebar: () => {
			requestSidebarToggle()
		},
		navigateTo: (target: ShellNavigationTarget) => {
			startTransition(() => {
				void host.navigate({
					to: openShellNavigationTarget(target, {
						scope: host.currentScope,
						fallbackSpaceId: host.currentSpaceId,
					}) as never,
				})
			})
		},
		goBack: host.goBack,
		goForward: host.goForward,
	}
}
