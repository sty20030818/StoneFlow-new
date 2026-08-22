import type { CommandHostContext, ShellCommandActions } from '@/features/command'

/**
 * 向壳命令宿主注册页筛选 handlers。
 * F → 锚定 FilterMenu；清除 → 当前 Filter Draft。
 */
export function registerFilterCommands(
	host: Pick<CommandHostContext, 'pageFilter'>,
): Pick<ShellCommandActions, 'openFilterMenu' | 'clearAllFilters'> {
	return {
		openFilterMenu: host.pageFilter.actions.openFilterMenu,
		clearAllFilters: host.pageFilter.actions.clearAll,
	}
}
