import type { CommandHostContext, ShellCommandActions } from '@/features/command'

import {
	emitFilterUiEvent,
	pageFilterKindToField,
} from '../model/filterUiEvents'

/**
 * 向壳命令宿主注册页筛选 handlers。
 * 打开筛选 → 锚定 FilterMenu（不再打开全页 filter-picker）。
 * 清空 → pageFilter.clearAll + 广播 clear-all（session.clearTemp）。
 * 切换已完成 → 仍走 pageFilter（Display 同步由列表桥 / P7 再纯 Display）。
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
