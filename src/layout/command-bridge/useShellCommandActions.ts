import { useMemo } from 'react'

import type { ShellCommandAdapter } from '@/features/command'
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
 * 组装 `ShellCommandAdapter`：
 * 1. 壳铬架（菜单 / 创建 dialog / 关层 / 导航）— compose 必填
 * 2. 各 domain 的 `registerXxxCommands(host)` — 缺则对应命令禁用
 *
 * layout 只做 compose 与 Host 装配，不在此文件写领域 mutation 规则。
 */
export function useShellCommandActions(deps: ShellCommandBridgeDeps): ShellCommandAdapter {
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
			deps.isSettingsMode,
			deps.isShortcutHelpOpen,
			deps.navigate,
			deps.openProjectCreateDialog,
			deps.openTaskCreateDialog,
			deps.pageFilter,
			deps.requestSearchFocus,
			deps.runEntityBulkActionFromCommand,
			deps.setCommandMenuFilterKind,
			deps.settingsReturnPath,
			deps.submitRegistryActions,
			deps.taskPreviewController,
			deps.toggleShortcutHelp,
		],
	)
}
