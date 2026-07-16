import type { ShellCommandActions } from '@/features/command'
import { useDialogStore } from '@/layout/model/useDialogStore'
import type { ShellCommandBridgeDeps } from '../types'

/** 页筛选：打开 picker / 切换已完成 / 清空 */
export function createFilterSlice(
	deps: Pick<ShellCommandBridgeDeps, 'pageFilter' | 'setCommandMenuFilterKind'>,
): Partial<ShellCommandActions> {
	return {
		openFilterPicker: (kind) => {
			deps.pageFilter.actions.openFilterPicker(kind)
			deps.setCommandMenuFilterKind(kind)
			useDialogStore.getState().openCommand('filter-picker', null, kind)
		},
		toggleCompletedFilter: () => {
			deps.pageFilter.actions.toggleCompleted()
		},
		clearAllFilters: () => {
			deps.pageFilter.actions.clearAll()
		},
	}
}
