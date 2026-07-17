import { useMemo } from 'react'

import type { ShellCommandActions } from '@/features/command'
import { registerFilterCommands } from '@/features/filter'
import { registerLifecycleCommands } from '@/features/lifecycle'
import { registerProjectCommands } from '@/features/project'
import { registerSubmitCommands } from '@/features/submit'
import { registerTaskCommands } from '@/features/task'

import { composeShellCommandActions } from './composeShellCommandActions'
import { registerShellChromeCommands } from './registerShellChromeCommands'
import type { ShellCommandBridgeDeps } from './types'

export type { ShellCommandBridgeDeps } from './types'

/**
 * 组装完整 `ShellCommandActions`：
 * 1. 壳铬架（菜单 / 创建 dialog / 关层 / 导航）
 * 2. 各 domain 的 `registerXxxCommands(host)`（task / project / lifecycle / filter / submit）
 *
 * layout 只做 compose 与 Host 装配，不在此文件写领域 mutation 规则。
 */
export function useShellCommandActions(deps: ShellCommandBridgeDeps): ShellCommandActions {
	return useMemo(
		() =>
			composeShellCommandActions(
				registerShellChromeCommands(deps),
				registerTaskCommands(deps),
				registerProjectCommands(deps),
				registerLifecycleCommands(deps),
				registerFilterCommands(deps),
				registerSubmitCommands(deps),
			),
		// eslint-disable-next-line react-hooks/exhaustive-deps -- bridge deps 袋由上层组装
		[
			deps.currentScope,
			deps.currentSpaceId,
			deps.activeDetail,
			deps.goBack,
			deps.goForward,
			deps.canGoBack,
			deps.closeEntityDrawer,
			deps.closeProjectCreateDialog,
			deps.closeTaskCreateDialog,
			deps.createDialogType,
			deps.handleOpenTaskCreate,
			deps.isCommandOpen,
			deps.isShortcutHelpOpen,
			deps.navigate,
			deps.openProjectCreateDialog,
			deps.openTaskCreateDialog,
			deps.pageFilter,
			deps.requestSearchFocus,
			deps.runEntityBulkActionFromCommand,
			deps.setCommandMenuFilterKind,
			deps.submitRegistryActions,
			deps.taskPreviewController,
			deps.toggleShortcutHelp,
		],
	)
}
