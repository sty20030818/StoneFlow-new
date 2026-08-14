import type { NavigateOptions } from '@tanstack/react-router'

import type { CommandContext } from '@/features/command/core'
import type {
	BulkActionId,
	BulkActionPayload,
	BulkActionResultMessageLabels,
	BulkEntityType,
} from '@/features/bulk-action'
import type { Scope } from '@/shared/types'

/**
 * 壳命令宿主端口：供各域 `registerXxxCommands(host)` 闭包使用。
 *
 * - layout 负责装配这些能力（导航、bulk 执行、dialog、筛选上下文等）并挂载命令 UI
 * - 各 feature 只依赖本类型，不直接 import layout 实现
 * - 形状与 `ShellCommandBridgeDeps` 对齐，Host 可原样传入 register*
 */
export type CommandHostContext = {
	runEntityBulkActionFromCommand: (
		ctx: CommandContext,
		entity: BulkEntityType,
		actionId: BulkActionId,
		labels: BulkActionResultMessageLabels,
		payload?: BulkActionPayload,
	) => Promise<void>

	pageFilter: {
		actions: {
			openFilterMenu: () => void
			toggleCompleted: () => void
			clearAll: () => void
		}
	}

	submitRegistryActions: {
		submitActiveTarget: (intent?: 'default' | 'continue' | 'open') => Promise<unknown>
	}

	currentScope: Scope
	currentSpaceId: string | null
	activeDetail: { kind: string; id: string } | null
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
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	openProjectCreateDialog: (...args: any[]) => void
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	openTaskCreateDialog: (...args: any[]) => void
	requestSearchFocus: () => void
	taskPreviewController: {
		previewState: { open: boolean }
		openPreview: (taskId: string, source: 'keyboard' | 'pointer') => void
		closePreview: () => void
	}
	toggleSidebar: () => void
	toggleShortcutHelp: () => void
	/** Settings Mode：Esc / 关闭应走 returnPath，而非会话 goBack */
	isSettingsMode?: boolean
	settingsReturnPath?: string
}
