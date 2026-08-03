import type { ShellCommandActions } from '@/features/command'

import { emitDisplayUiEvent } from '../model/displayUiEvents'

/**
 * 向壳命令宿主注册显示选项 handlers。
 * Shift+F → 打开锚定 Display 面板。
 */
export function registerDisplayCommands(): Pick<ShellCommandActions, 'openDisplayOptions'> {
	return {
		openDisplayOptions: () => {
			emitDisplayUiEvent({ type: 'open-menu' })
		},
	}
}
