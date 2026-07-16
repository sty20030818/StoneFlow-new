import type { ShellCommandActions } from '@/features/command'
import { useDialogStore } from '@/app/layouts/shell/model/useDialogStore'
import { TASK_BULK_ACTION_IDS } from '@/features/bulk-action'
import type { ShellCommandBridgeDeps } from '../types'

/** 任务归属/优先级/状态/日期 picker 与 apply placement */
export function createTaskMetaSlice(
	deps: Pick<ShellCommandBridgeDeps, 'runEntityBulkActionFromCommand'>,
): Partial<ShellCommandActions> {
	return {
		openTaskPlacementPicker: (ctx) => {
			useDialogStore.getState().openCommand('task-placement-picker', ctx.selection)
		},
		applyTaskPlacement: (target, ctx) =>
			deps.runEntityBulkActionFromCommand(
				ctx,
				'task',
				TASK_BULK_ACTION_IDS.setPlacementSelected,
				{ successVerb: '整理', entityLabel: '任务' },
				{ target },
			),
		openTaskPriorityPicker: (ctx) => {
			useDialogStore.getState().openCommand('task-priority-picker', ctx.selection)
		},
		openTaskStatusPicker: (ctx) => {
			useDialogStore.getState().openCommand('task-status-picker', ctx.selection)
		},
		openTaskDatePicker: (ctx) => {
			useDialogStore.getState().openCommand('task-date-picker', ctx.selection)
		},
	}
}
