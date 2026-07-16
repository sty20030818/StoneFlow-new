import type { ShellCommandActions } from '@/features/command'
import { useDialogStore } from '@/layout/model/useDialogStore'
import type { ShellCommandBridgeDeps } from '../types'

/** 命令板 / 快捷键帮助 / 搜索聚焦 */
export function createMenuSlice(
	deps: Pick<ShellCommandBridgeDeps, 'toggleShortcutHelp' | 'requestSearchFocus'>,
): Partial<ShellCommandActions> {
	return {
		openCommandMenu: () => {
			useDialogStore.getState().openCommand('default')
		},
		openShortcutHelp: () => {
			deps.toggleShortcutHelp()
		},
		focusSearch: deps.requestSearchFocus,
	}
}
