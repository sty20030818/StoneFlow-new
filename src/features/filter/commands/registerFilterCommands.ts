import { useDialogStore } from '@/features/shell-dialogs'
import type { CommandHostContext, ShellCommandActions } from '@/features/command'

/**
 * 向壳命令宿主注册页筛选 handlers：
 * 打开筛选 picker、切换「显示已完成」、清空全部筛选。
 * 依赖页级 PageFilterProvider 已注册的 controller。
 */
export function registerFilterCommands(
	host: Pick<CommandHostContext, 'pageFilter' | 'setCommandMenuFilterKind'>,
): Pick<ShellCommandActions, 'openFilterPicker' | 'toggleCompletedFilter' | 'clearAllFilters'> {
	return {
		openFilterPicker: (kind) => {
			host.pageFilter.actions.openFilterPicker(kind)
			host.setCommandMenuFilterKind(kind)
			useDialogStore.getState().openCommand('filter-picker', null, kind)
		},
		toggleCompletedFilter: () => {
			host.pageFilter.actions.toggleCompleted()
		},
		clearAllFilters: () => {
			host.pageFilter.actions.clearAll()
		},
	}
}
