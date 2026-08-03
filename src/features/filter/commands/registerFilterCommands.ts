import type { CommandHostContext, ShellCommandActions } from '@/features/command'

import { emitFilterUiEvent } from '../model/filterUiEvents'

/**
 * 向壳命令宿主注册页筛选 handlers。
 * F → 锚定 FilterMenu；清除 → clear-all；切换已完成 → Display。
 */
export function registerFilterCommands(
	host: Pick<CommandHostContext, 'pageFilter'>,
): Pick<ShellCommandActions, 'openFilterMenu' | 'toggleCompletedFilter' | 'clearAllFilters'> {
	return {
		openFilterMenu: () => {
			host.pageFilter.actions.openFilterMenu()
			emitFilterUiEvent({ type: 'open-menu' })
		},
		toggleCompletedFilter: () => {
			host.pageFilter.actions.toggleCompleted()
		},
		clearAllFilters: () => {
			host.pageFilter.actions.clearAll()
			emitFilterUiEvent({ type: 'clear-all' })
		},
	}
}
