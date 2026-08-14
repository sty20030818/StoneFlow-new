import type { NavigateOptions } from '@tanstack/react-router'

import type { Scope } from '@/shared/types'
import { useDialogStore } from '@/features/shell-dialogs'
import type { CommandContext } from '@/features/command'
import type { EntityDetailRouteState } from '@/features/entity-detail'
import type {
	BulkActionId,
	BulkActionPayload,
	BulkActionResultMessageLabels,
	BulkEntityType,
} from '@/features/bulk-action'
import type { usePageFilterContext } from '@/features/filter'
import type { useSubmitRegistryActions } from '@/features/submit'
import type { useTaskPreviewController } from '@/features/task'

export type PageFilter = ReturnType<typeof usePageFilterContext>
export type SubmitActions = ReturnType<typeof useSubmitRegistryActions>
export type TaskPreview = ReturnType<typeof useTaskPreviewController>

/**
 * Command bridge 依赖袋。
 * 字段对应 chrome + 各域 register 所需 Host 端口，不是「必填 34 方法」上帝表。
 */
export type ShellCommandBridgeDeps = {
	/** 当前工作区 scope，用于 navigateTo 拼 path */
	currentScope: Scope
	/** 当前 spaceId（all 时可能为 fallback） */
	currentSpaceId: string | null
	/** 当前 URL 抽屉详情 */
	activeDetail: EntityDetailRouteState
	goBack: () => void
	goForward: () => void
	canGoBack: boolean
	closeEntityDrawer: () => void
	closeProjectCreateDialog: () => void
	closeTaskCreateDialog: () => void
	createDialogType: 'task' | 'project' | null
	handleOpenTaskCreate: () => void
	isCommandOpen: boolean
	isShortcutHelpOpen: boolean
	navigate: (opts: { to: never } | NavigateOptions) => unknown
	openProjectCreateDialog: () => void
	openTaskCreateDialog: ReturnType<typeof useDialogStore.getState>['openTaskCreateDialog']
	pageFilter: PageFilter
	requestSearchFocus: () => void
	runEntityBulkActionFromCommand: (
		ctx: CommandContext,
		entity: BulkEntityType,
		actionId: BulkActionId,
		labels: BulkActionResultMessageLabels,
		payload?: BulkActionPayload,
	) => Promise<void>
	/** Settings Mode 下 Esc 关层最终出口 */
	isSettingsMode?: boolean
	settingsReturnPath?: string
	submitRegistryActions: SubmitActions
	taskPreviewController: TaskPreview
	toggleSidebar: () => void
	toggleShortcutHelp: () => void
}
