import type { ShellCommandActions } from '@/features/command'
import { useDialogStore } from '@/layout/model/useDialogStore'
import type { ShellCommandBridgeDeps } from '../types'

/**
 * Esc / close 关层优先级：
 * 快捷键帮助 → 创建弹窗 → 实体抽屉 → 预览 → 命令板 → 清空选择 → 历史后退
 */
export function createLayerSlice(
	deps: Pick<
		ShellCommandBridgeDeps,
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
	>,
): Partial<ShellCommandActions> {
	return {
		closeCurrentLayer: (ctx) => {
			if (deps.isShortcutHelpOpen) {
				useDialogStore.getState().closeShortcutHelp()
				return
			}
			if (deps.createDialogType === 'task') {
				deps.closeTaskCreateDialog()
				return
			}
			if (deps.createDialogType === 'project') {
				deps.closeProjectCreateDialog()
				return
			}
			if (deps.activeDetail) {
				deps.closeEntityDrawer()
				return
			}
			if (deps.taskPreviewController.previewState.open) {
				deps.taskPreviewController.closePreview()
				return
			}
			if (deps.isCommandOpen) {
				useDialogStore.getState().closeCommand()
				return
			}
			if (ctx.selection.hasSelection) {
				ctx.selection.clearSelection?.()
				return
			}
			if (deps.canGoBack) {
				deps.goBack()
			}
		},
	}
}
