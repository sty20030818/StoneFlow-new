import { useMemo } from 'react'

import type { ShellCommandActions } from '@/features/command'
import { composeShellCommandActions } from './composeShellCommandActions'
import type { ShellCommandBridgeDeps } from './types'
import { createMenuSlice } from './slices/menuSlice'
import { createCreateSlice } from './slices/createSlice'
import { createLayerSlice } from './slices/layerSlice'
import { createSubmitSlice } from './slices/submitSlice'
import { createNavSlice } from './slices/navSlice'
import { createPreviewSlice } from './slices/previewSlice'
import { createFilterSlice } from './slices/filterSlice'
import { createTaskMetaSlice } from './slices/taskMetaSlice'
import { createBulkSlice } from './slices/bulkSlice'

export type { ShellCommandBridgeDeps } from './types'

/**
 * 组合各 command slice → 完整 ShellCommandActions。
 * 新增命令：在对应 slices/* 加方法，并确认 compose 能覆盖。
 */
export function useShellCommandActions(deps: ShellCommandBridgeDeps): ShellCommandActions {
	return useMemo(
		() =>
			composeShellCommandActions(
				createMenuSlice(deps),
				createCreateSlice(deps),
				createLayerSlice(deps),
				createSubmitSlice(deps),
				createNavSlice(deps),
				createPreviewSlice(deps),
				createFilterSlice(deps),
				createTaskMetaSlice(deps),
				createBulkSlice(deps),
			),
		// deps 对象字段由调用方稳定引用；整袋依赖避免漏字段
		// eslint-disable-next-line react-hooks/exhaustive-deps -- bridge deps 袋由上层 useMemo/useCallback 组装
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
