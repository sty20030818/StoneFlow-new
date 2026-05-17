import type { ReactNode } from 'react'

import type { MainCardToolbarPill } from '@/app/layouts/main-card/MainCardLayout'
import type { TaskPriorityValue } from '@/features/task/model/taskPriority'
import type {
	LifecycleEntry,
	LifecycleMode,
	ProjectOverviewItem,
	TaskListItem,
	TaskStatus,
} from '@/shared/types'
import type { BoardSection } from '@/shared/ui/board'

export type EntitySceneVariant =
	| 'inbox'
	| 'all-tasks'
	| 'view'
	| 'no-project'
	| 'archive'
	| 'trash'
	| 'project-overview'
	| 'project-detail'
	| 'settings'

export type BoardKind = 'task' | 'project' | 'lifecycle'

export type EntitySceneTaskBoardConfig = {
	variant: 'inbox' | 'all-tasks' | 'view' | 'no-project' | 'project-detail'
	emptyTitle?: string
	emptyDescription?: string
	emptyActionLabel?: string
	hideEmptySections?: boolean
	statusOrder?: readonly TaskStatus[]
	customSections?: Array<{
		key: string
		label: string
		tasks: TaskListItem[]
	}>
	createProjectId?: string | null
}

export type EntitySceneTaskBoardData = {
	items?: TaskListItem[]
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
	onUpdateTaskPriority?: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus?: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onToggleTaskStatus?: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask?: (taskId: string) => void
	projectOptions?: Array<{ id: string; name: string }>
	onSelectProject?: (task: TaskListItem, projectId: string) => void
	onSelectNoProject?: (task: TaskListItem) => void
}

export type EntitySceneProjectBoardConfig = {
	variant: 'overview'
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
}

export type EntitySceneProjectBoardData = {
	items?: ProjectOverviewItem[]
	status?: 'idle' | 'loading' | 'ready' | 'error'
	busyProjectId?: string | null
	selectedProjectIds?: Set<string>
}

export type EntitySceneProjectBoardActions = {
	onEmptyAction?: () => void
	onOpenProject?: (projectId: string) => void
	onCompleteProject?: (projectId: string) => void
	onReopenProject?: (projectId: string) => void
	onArchiveProject?: (projectId: string) => void
	onDeleteProject?: (projectId: string) => void
	onToggleProjectSelection?: (projectId: string) => void
}

export type EntitySceneLifecycleBoardConfig = {
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	mode: LifecycleMode
}

export type EntitySceneLifecycleBoardData = {
	sections: BoardSection<LifecycleEntry>[]
	pendingEntryId?: string | null
	selectedEntryIdSet?: Set<string>
}

export type EntitySceneLifecycleBoardActions = {
	onEmptyAction?: () => void
	onRestore: (entry: LifecycleEntry) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
	onToggleEntrySelection?: (entryId: string) => void
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
	onRefresh?: () => void
	refreshDisabled?: boolean
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
