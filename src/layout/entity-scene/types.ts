import type { ReactNode } from 'react'

import type { MainCardToolbarPill } from '@/shared/components/main-card/MainCardLayout'
import type { TaskDisplayPropertyKey } from '@/features/display-options/core'
import type { TaskPlacementTarget } from '@/features/metadata-fields'
import type { TaskPriorityValue } from '@/features/task'
import type {
	LifecycleEntry,
	LifecycleMode,
	ProjectOverviewItem,
	TaskListItem,
	TaskStatus,
} from '@/shared/types'
import type { BoardSection } from '@/shared/components/board'

export type EntitySceneVariant =
	| 'inbox'
	| 'tasks'
	| 'view'
	| 'no-project'
	| 'archive'
	| 'trash'
	| 'project-overview'
	| 'project-detail'
	| 'settings'

export type BoardKind = 'task' | 'project' | 'lifecycle'
export type EntitySceneBoardStatus = 'idle' | 'loading' | 'ready' | 'error'

export type EntitySceneTaskBoardConfig = {
	variant: 'inbox' | 'tasks' | 'view' | 'no-project' | 'project-detail'
	emptyTitle?: string
	emptyDescription?: string
	emptyActionLabel?: string
	hideEmptySections?: boolean
	statusOrder?: readonly TaskStatus[]
	visibleProperties?: TaskDisplayPropertyKey[]
	customSections?: Array<{
		key: string
		label: string
		tasks: TaskListItem[]
	}>
	createProjectId?: string | null
}

export type EntitySceneTaskBoardData = {
	items?: TaskListItem[]
	status?: EntitySceneBoardStatus
	activeItemId?: string | null
	pendingItemId?: string | null
	selectedTaskIdSet?: Set<string>
	focusedTaskId?: string | null
}

export type EntitySceneTaskBoardActions = {
	onEmptyAction?: () => void
	onToggleTaskSelection?: (taskId: string) => void
	onSetFocusedTask?: (taskId: string | null) => void
	onMoveTaskFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearTaskSelection?: () => void
	onSelectAllTasks?: (taskIds: string[]) => void
	onUpdateTaskPriority?: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus?: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onUpdateTaskDueDate?: (task: TaskListItem, dueAt: string | null) => Promise<void>
	onUpdateTaskScheduledAt?: (task: TaskListItem, scheduledAt: string | null) => Promise<void>
	onUpdateTaskReminderAt?: (task: TaskListItem, reminderAt: string | null) => Promise<void>
	onToggleTaskStatus?: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask?: (taskId: string) => void
	onPeekTask?: (taskId: string, source: 'keyboard' | 'pointer') => void
	projectOptions?: Array<{ id: string; name: string; spaceId: string }>
	spaces?: Array<{ id: string; name: string }>
	onSelectPlacement?: (task: TaskListItem, target: TaskPlacementTarget) => void
	showProjectCellOptions?: boolean
}

export type EntitySceneProjectBoardConfig = {
	variant: 'overview'
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
}

export type EntitySceneProjectBoardData = {
	items?: ProjectOverviewItem[]
	status?: EntitySceneBoardStatus
	busyProjectId?: string | null
	selectedProjectIds?: Set<string>
	focusedProjectId?: string | null
}

export type EntitySceneProjectBoardActions = {
	onEmptyAction?: () => void
	onOpenProject?: (projectId: string) => void
	onCompleteProject?: (projectId: string) => void
	onReopenProject?: (projectId: string) => void
	onArchiveProject?: (projectId: string) => void
	onDeleteProject?: (projectId: string) => void
	onToggleProjectSelection?: (projectId: string) => void
	onSetFocusedProject?: (projectId: string | null) => void
	onMoveProjectFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearProjectSelection?: () => void
	onSelectAllProjects?: (projectIds: string[]) => void
}

export type EntitySceneLifecycleBoardConfig = {
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	mode: LifecycleMode
}

export type EntitySceneLifecycleBoardData = {
	sections: BoardSection<LifecycleEntry>[]
	status?: EntitySceneBoardStatus
	pendingEntryId?: string | null
	selectedEntryIdSet?: Set<string>
	focusedEntryId?: string | null
}

export type EntitySceneLifecycleBoardActions = {
	onEmptyAction?: () => void
	onRestore: (entry: LifecycleEntry) => void
	onRestoreEntries?: (entries: LifecycleEntry[]) => void
	onMoveToTrash?: (entry: LifecycleEntry) => void
	onMoveToTrashEntries?: (entries: LifecycleEntry[]) => void
	onPermanentlyDelete?: (entry: LifecycleEntry) => void
	onPermanentlyDeleteEntries?: (entries: LifecycleEntry[]) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
	onToggleEntrySelection?: (entryId: string) => void
	onSetFocusedEntry?: (entryId: string | null) => void
	onMoveEntryFocus?: (
		delta: number,
		options?: {
			preserveAnchor?: boolean
			selectRange?: boolean
			startFromId?: string | null
			resetAnchorToStart?: boolean
		},
	) => string | null
	onClearEntrySelection?: () => void
	onSelectAllEntries?: (entryIds: string[]) => void
}

export type EntitySceneBoardSlotProps =
	| {
			boardKind: 'task'
			boardConfig: EntitySceneTaskBoardConfig
			boardData: EntitySceneTaskBoardData
			boardActions: EntitySceneTaskBoardActions
	  }
	| {
			boardKind: 'project'
			boardConfig: EntitySceneProjectBoardConfig
			boardData: EntitySceneProjectBoardData
			boardActions: EntitySceneProjectBoardActions
	  }
	| {
			boardKind: 'lifecycle'
			boardConfig: EntitySceneLifecycleBoardConfig
			boardData: EntitySceneLifecycleBoardData
			boardActions: EntitySceneLifecycleBoardActions
	  }

export type EntitySceneProps = {
	sceneVariant: EntitySceneVariant
	breadcrumb: ReactNode
	headerActions?: ReactNode
	headerClassName?: string
	toolbarPills?: MainCardToolbarPill[]
	toolbarLeft?: ReactNode
	toolbarFilterAction?: ReactNode
	toolbarDisplayAction?: ReactNode
	/** 页级状态提示区 */
	notices?: ReactNode
	/** Board 区块头部（位于 notices 与 board slot 之间） */
	boardHeader?: ReactNode
	/** Board 之前的扩展内容 */
	beforeBoard?: ReactNode
	/** Board 之后的扩展内容 */
	afterBoard?: ReactNode
	/** 页级尾部区域 */
	footer?: ReactNode
	/** 批量操作条（固定在 scene 的 board 之后） */
	bulkBar?: ReactNode
	bodyClassName?: string
	/** 非 board 页面可省略，例如 settings */
	board?: EntitySceneBoardSlotProps
}
