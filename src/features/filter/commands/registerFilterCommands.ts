import type { CommandHostContext, ShellCommandActions } from '@/features/command'

import {
	emitFilterUiEvent,
	pageFilterKindToField,
} from '../model/filterUiEvents'

/**
 * 向壳命令宿主注册页筛选 handlers。
 * 打开筛选 → 锚定 FilterMenu；清空 → clear-all 事件；切换已完成 → 页 controller（Display 真源经适配器）。
 */
export function registerFilterCommands(
	host: Pick<CommandHostContext, 'pageFilter' | 'setCommandMenuFilterKind'>,
): Pick<ShellCommandActions, 'openFilterPicker' | 'toggleCompletedFilter' | 'clearAllFilters'> {
	return {
		openFilterPicker: (kind) => {
			host.pageFilter.actions.openFilterPicker(kind)
			host.setCommandMenuFilterKind(kind)
			emitFilterUiEvent({
				type: 'open-menu',
				field: pageFilterKindToField(kind),
			})
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
