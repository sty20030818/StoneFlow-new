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
import type { CanonicalBoardSection } from './CanonicalBoard'

export type EntitySceneVariant =
	| 'inbox'
	| 'all-tasks'
	| 'view'
	| 'no-project'
	| 'archive'
	| 'trash'
	| 'project-overview'
	| 'project-detail'

export type BoardKind = 'task' | 'project' | 'lifecycle'

export type EntitySceneTaskBoardConfig = {
	variant: 'inbox' | 'all-tasks' | 'view' | 'no-project' | 'project-detail'
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	hideEmptySections?: boolean
	showProjectName?: boolean
	statusOrder?: TaskStatus[]
	sectionVariant?: 'compact' | 'project'
	rowVariant?: 'stacked' | 'project'
	renderRowActions?: (task: TaskListItem) => ReactNode
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
}

export type EntitySceneTaskBoardActions = {
	onEmptyAction?: () => void
	onToggleTaskSelection?: (taskId: string) => void
	onUpdateTaskPriority?: (task: TaskListItem, priority: TaskPriorityValue) => Promise<void>
	onUpdateTaskStatus?: (task: TaskListItem, status: TaskStatus) => Promise<void>
	onToggleTaskStatus?: (task: TaskListItem) => Promise<void>
	onArchiveTask?: (task: TaskListItem) => Promise<void>
	onDeleteTask?: (task: TaskListItem) => Promise<void>
	onOpenTask?: (taskId: string) => void
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
}

export type EntitySceneProjectBoardActions = {
	onEmptyAction?: () => void
	onOpenProject?: (projectId: string) => void
	onCompleteProject?: (projectId: string) => void
	onReopenProject?: (projectId: string) => void
	onArchiveProject?: (projectId: string) => void
	onDeleteProject?: (projectId: string) => void
}

export type EntitySceneLifecycleBoardConfig = {
	emptyTitle: string
	emptyDescription: string
	emptyActionLabel?: string
	mode: LifecycleMode
}

export type EntitySceneLifecycleBoardData = {
	sections: CanonicalBoardSection<LifecycleEntry>[]
	pendingEntryId?: string | null
}

export type EntitySceneLifecycleBoardActions = {
	onEmptyAction?: () => void
	onRestore: (entry: LifecycleEntry) => void
	onDeleteFromArchive?: (entry: LifecycleEntry) => void
	onPermanentlyDelete?: (entry: LifecycleEntry) => void
	onOpenDetail?: (entry: LifecycleEntry) => void
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
	notices?: ReactNode
	beforeBoard?: ReactNode
	afterBoard?: ReactNode
	footer?: ReactNode
	bulkActions?: ReactNode
	bodyClassName?: string
	board: EntitySceneBoardSlotProps
}
