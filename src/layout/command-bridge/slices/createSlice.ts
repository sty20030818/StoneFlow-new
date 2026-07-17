import type { ShellCommandActions } from '@/features/command'
import { useDialogStore } from '@/features/shell-dialogs'
import type { ShellCommandBridgeDeps } from '../types'

/** 新建任务/项目、实体 picker */
export function createCreateSlice(
	deps: Pick<
		ShellCommandBridgeDeps,
		'handleOpenTaskCreate' | 'openTaskCreateDialog' | 'openProjectCreateDialog'
	>,
): Partial<ShellCommandActions> {
	return {
		openQuickTaskCreate: deps.handleOpenTaskCreate,
		openFullTaskCreate: () => deps.openTaskCreateDialog(undefined, 'default'),
		openInboxTaskCreate: () => deps.openTaskCreateDialog({ placement: 'inbox' }, 'default'),
		openProjectCreate: () => deps.openProjectCreateDialog(),
		openTaskPicker: () => {
			useDialogStore.getState().openCommand('task-picker')
		},
		openProjectPicker: () => {
			useDialogStore.getState().openCommand('project-picker')
		},
	}
}
